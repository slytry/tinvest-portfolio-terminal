const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

async function downloadBondsExcel() {
	console.log("🚀 Запускаем браузер...");

	// Оптимизированные настройки браузера
	const browser = await puppeteer.launch({
		headless: "new", // используем новый безголовый режим (быстрее)
		defaultViewport: { width: 1920, height: 1080 },
		args: [
			'--no-sandbox',
			'--disable-setuid-sandbox',
			'--disable-dev-shm-usage',
			'--disable-accelerated-2d-canvas',
			'--disable-gpu',
			'--window-size=1920,1080'
		],
	});

	const page = await browser.newPage();

	// Блокируем ненужные ресурсы для ускорения
	await page.setRequestInterception(true);
	page.on('request', (request) => {
		const resourceType = request.resourceType();
		if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
			request.abort();
		} else {
			request.continue();
		}
	});

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
			waitUntil: "domcontentloaded", // быстрее чем networkidle2
			timeout: 15000,
		});

		console.log("⏳ Ждем загрузки таблицы...");
		// Используем более быстрый селектор
		await page.waitForSelector("#DataTables_Table_0", { timeout: 5000 });

		// Минимальная задержка
		await new Promise((resolve) => setTimeout(resolve, 500));

		console.log("🖱 Нажимаем на кнопку...");

		// Оптимизированный клик
		const buttonClicked = await page.evaluate(() => {
			const button = document.querySelector("button.buttons-excel");
			if (button) {
				button.click();
				return true;
			}
			return false;
		});

		if (buttonClicked) {
			console.log("✅ Кнопка нажата!");

			// Уменьшаем время ожидания скачивания
			await new Promise((resolve) => setTimeout(resolve, 2000));

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

				fs.copyFileSync(sourcePath, destPath);
				console.log(`✅ Файл сохранен: ${destPath}`);

				// Очищаем временные файлы
				excelFiles.forEach(f => {
					fs.unlinkSync(path.join(downloadPath, f));
				});
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
