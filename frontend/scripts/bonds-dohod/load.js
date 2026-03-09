const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

async function downloadBondsExcel() {
	console.log("🚀 Запускаем браузер...");

	const browser = await puppeteer.launch({
		headless: 'new', // Временно ставим false для отладки
		defaultViewport: { width: 1920, height: 1080 },
		args: [
			'--no-sandbox',
			'--disable-setuid-sandbox',
			'--disable-dev-shm-usage',
			'--window-size=1920,1080'
		],
	});

	const page = await browser.newPage();

	// НЕ БЛОКИРУЕМ ресурсы - они нужны для работы таблицы!
	// Убираем блокировку или блокируем только совсем ненужное

	// Настраиваем скачивание
	const downloadPath = path.resolve("./downloads");
	if (!fs.existsSync(downloadPath)) {
		fs.mkdirSync(downloadPath, { recursive: true });
	}

	// Перехватываем скачивание
	const client = await page.target().createCDPSession();
	await client.send("Browser.setDownloadBehavior", {
		behavior: "allow",
		downloadPath: downloadPath,
	});

	try {
		console.log("📱 Открываем сайт...");
		await page.goto("https://www.dohod.ru/analytic/bonds", {
			waitUntil: "networkidle2", // Возвращаем networkidle2 для полной загрузки
			timeout: 30000,
		});

		console.log("⏳ Ждем загрузки таблицы...");
		await page.waitForSelector("#DataTables_Table_0", { timeout: 10000 });

		// Ждем появления данных в таблице
		await page.waitForFunction(() => {
			const table = document.querySelector("#DataTables_Table_0");
			return table && table.querySelectorAll('tr').length > 5;
		}, { timeout: 10000 });

		// Даем время на полную загрузку данных
		await new Promise((resolve) => setTimeout(resolve, 2000));

		console.log("🖱 Нажимаем на кнопку...");

		// Кликаем по кнопке
		const buttonClicked = await page.evaluate(() => {
			const button = document.querySelector("button.buttons-excel");
			if (button) {
				button.scrollIntoView();
				button.click();
				return true;
			}
			return false;
		});

		if (buttonClicked) {
			console.log("✅ Кнопка нажата!");

			// Ждем скачивания
			await new Promise((resolve) => setTimeout(resolve, 5000));

			// Проверяем файлы
			const files = fs.readdirSync(downloadPath);
			const excelFiles = files.filter((f) => f.endsWith(".xlsx"));

			if (excelFiles.length > 0) {
				const latestFile = excelFiles
					.map((f) => ({
						name: f,
						time: fs.statSync(path.join(downloadPath, f)).mtimeMs,
					}))
					.sort((a, b) => b.time - a.time)[0].name;

				const sourcePath = path.join(downloadPath, latestFile);
				const destPath = path.join(__dirname, "bonds_analysis.xlsx");

				// Проверяем размер файла (не пустой ли)
				const stats = fs.statSync(sourcePath);
				if (stats.size < 1000) {
					console.warn("⚠️ Файл слишком маленький, возможно пустой");
				}

				fs.copyFileSync(sourcePath, destPath);
				console.log(`✅ Файл сохранен: ${destPath} (${stats.size} bytes)`);

				// Очищаем временные файлы
				excelFiles.forEach(f => {
					fs.unlinkSync(path.join(downloadPath, f));
				});
			} else {
				console.log("❌ Файл не найден в папке загрузок");
			}
		} else {
			console.log("❌ Кнопка не найдена");
		}
	} catch (error) {
		console.error("❌ Ошибка:", error);
	} finally {
		console.log("👋 Закрываем браузер...");
		await browser.close();

		// Удаляем пустую папку downloads
		try {
			fs.rmdirSync(downloadPath);
		} catch {}
	}
}

// Запускаем с обработкой ошибок
downloadBondsExcel().catch(console.error);
