const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { format } = require('date-fns');
const { ru } = require('date-fns/locale');

const CONFIG = {
    inputFile: 'scripts/bonds-dohod/bonds_analysis.xlsx',
    outputDir: 'public/data',
    dateFormat: 'yyyy-MM-dd_HH-mm',
    prettyJson: true
};

const COLUMN_MAPPING = {
    'ISIN': 'isin',
    'Название': 'name',
    'Эмитент': 'issuer',
    'Основной заемщик': 'mainBorrower',
    'Страна заемщика': 'borrowerCountry',
    'Валюта номинала': 'currency',
    'Объем выпуска в обращении, млрд': 'volume',
    'Ближайшая дата погашения/оферты (Дата)': 'maturityDate',
    'Лет до даты': 'yearsToMaturity',
    'Дюрация': 'duration',
    'Событие в дату': 'eventAtDate',
    'Эффективная доходность (YTM), %': 'ytm',
    'Примерная доходность без реинвестирования, %': 'simpleYtm',
    'Доля прибыли от реинвестирования (к погашению)': 'reinvestmentShare',
    'Простая доходность, %': 'simpleYield',
    'Текущая доходность, %': 'currentYield',
    'Кредитное качество (рэнкинг)': 'creditRating',
    'Кредитное качество (число, max=10)': 'creditScore',
    'Качество эмитента (max=10)': 'issuerQuality',
    'Inside Q (max=10)': 'insideQ',
    'Outside Q (max=10)': 'outsideQ',
    'NetDebt/Equity (рейтинг) (max=10)': 'netDebtEquity',
    'Коэф. Ликвидности (max=100)': 'liquidityRatio',
    'Медиана дневного оборота (млн в валюте торгов)': 'dailyTurnover',
    'Сложность (max=5)': 'complexity',
    'Размер (max=10)': 'size',
    'Дата выпуска': 'issueDate',
    'Дата погашения': 'finalMaturityDate',
    'Дата, к которой рассчитывается доходность': 'yieldCalculationDate',
    'Текущий номинал': 'currentNominal',
    'Минимальный лот': 'minLot',
    'Цена, % от номинала': 'price',
    'НКД': 'accruedInterest',
    'Размер купона': 'couponAmount',
    'Текущий купон, %': 'couponRate',
    'Купон (раз/год)': 'couponPerYear',
    'Тип купона': 'couponType',
    'Субординированная (да/нет)': 'subordinated',
    'С гарантией (да/нет)': 'guaranteed',
    'Тип эмитента': 'issuerType',
    'Базовый индекс (для FRN)': 'baseIndex',
    'Премия/Дисконт к базовому индексу (для FRN)': 'indexPremium'
};

async function convertExcelToJson() {
    console.log('🔄 Начинаем конвертацию Excel в JSON...');

    if (!fs.existsSync(CONFIG.inputFile)) {
        console.error(`❌ Файл ${CONFIG.inputFile} не найден!`);
        return;
    }

    // Создаем папку public/data если её нет
    if (!fs.existsSync(CONFIG.outputDir)) {
        fs.mkdirSync(CONFIG.outputDir, { recursive: true });
        console.log(`📁 Создана папка: ${CONFIG.outputDir}`);
    }

    console.log('📖 Читаем Excel файл...');
    const workbook = XLSX.readFile(CONFIG.inputFile);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    const headers = rawData[0];
    const dataRows = rawData.slice(1);

    console.log(`📊 Найдено заголовков: ${headers.length}`);
    console.log(`📊 Найдено строк: ${dataRows.length}`);

    const bonds = dataRows.map(row => {
        const bond = {};
        headers.forEach((header, index) => {
            let value = row[index];
            const englishKey = COLUMN_MAPPING[header] || header;

            if (value !== undefined && value !== null && value !== 'n/a' && value !== '') {
                // Обработка строк с запятыми (числа)
                if (typeof value === 'string' && value.includes(',')) {
                    value = value.replace(',', '.');
                }

                // Пробуем преобразовать в число, если это число
                if (typeof value === 'string' && !isNaN(value) && value.trim() !== '') {
                    bond[englishKey] = parseFloat(value);
                }
                // Обработка строк с процентами
                else if (typeof value === 'string' && value.includes('%')) {
                    bond[englishKey] = parseFloat(value.replace('%', ''));
                }
                // Обработка дат
                else if (typeof value === 'string' && value.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
                    bond[englishKey] = value;
                }
                // Обработка чисел
                else if (typeof value === 'number') {
                    bond[englishKey] = value;
                }
                // Все остальное - строки (обрезаем пробелы)
                else if (typeof value === 'string') {
                    bond[englishKey] = value.trim();
                } else {
                    bond[englishKey] = value;
                }
            } else {
                bond[englishKey] = null;
            }
        });
        return bond;
    }).filter(bond => bond.isin); // Убираем пустые строки

    // Очищаем данные от выбросов для статистики
    const validYtm = bonds
        .map(b => b.ytm)
        .filter(v => v && !isNaN(v) && v > -50 && v < 100);

    const timestamp = new Date();
    const dateStr = format(timestamp, CONFIG.dateFormat);
    const readableDate = format(timestamp, 'dd MMMM yyyy HH:mm', { locale: ru });

    const webData = {
        meta: {
            generated: timestamp.toISOString(),
            generatedReadable: readableDate,
            source: 'https://www.dohod.ru/analytic/bonds',
            totalBonds: bonds.length,
            version: '1.0.0'
        },
        stats: {
            averageYtm: calculateAverage(validYtm),
            maxYtm: calculateMax(validYtm),
            minYtm: calculateMin(validYtm),
            totalVolume: calculateSum(bonds.map(b => b.volume)),
            byCurrency: groupBy(bonds, 'currency'),
            byRating: groupBy(bonds, 'creditRating'),
            byIssuerType: groupBy(bonds, 'issuerType'),
            byCouponType: groupBy(bonds, 'couponType')
        },
        bonds: bonds
    };

    // 1. Сохраняем файл с датой
    const datedFilename = `bonds_${dateStr}.json`;
    const datedPath = path.join(CONFIG.outputDir, datedFilename);

    // 2. Сохраняем как bonds_latest.json (последняя версия)
    const latestPath = path.join(CONFIG.outputDir, 'bonds_latest.json');

    const jsonString = CONFIG.prettyJson
        ? JSON.stringify(webData, null, 2)
        : JSON.stringify(webData);

    // Сохраняем оба файла
    fs.writeFileSync(datedPath, jsonString);
    fs.writeFileSync(latestPath, jsonString);

    console.log('\n✅ Готово!');
    console.log(`📊 Всего облигаций: ${bonds.length}`);
    console.log(`📁 Файлы сохранены:`);
    console.log(`   📄 ${datedPath}`);
    console.log(`   📄 ${latestPath} (последняя версия)`);

    // Показываем статистику
    console.log('\n📈 Статистика:');
    console.log(`   Средняя YTM: ${webData.stats.averageYtm.toFixed(2)}%`);
    console.log(`   Макс YTM: ${webData.stats.maxYtm.toFixed(2)}%`);
    console.log(`   Мин YTM: ${webData.stats.minYtm.toFixed(2)}%`);
    console.log(`   Общий объем: ${webData.stats.totalVolume.toFixed(2)} млрд`);

    console.log('\n📊 Распределение по типам эмитентов:');
    Object.entries(webData.stats.byIssuerType).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
    });

    // Показываем структуру папок
    console.log('\n📁 Структура public/data:');
    console.log('   public/');
    console.log('   └── data/');
    console.log(`       ├── ${datedFilename}`);
    console.log('       └── bonds_latest.json');
}

// Вспомогательные функции
function calculateAverage(arr) {
    const valid = arr.filter(v => v && !isNaN(v));
    return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : 0;
}

function calculateMax(arr) {
    const valid = arr.filter(v => v && !isNaN(v));
    return valid.length ? Math.max(...valid) : 0;
}

function calculateMin(arr) {
    const valid = arr.filter(v => v && !isNaN(v));
    return valid.length ? Math.min(...valid) : 0;
}

function calculateSum(arr) {
    const valid = arr.filter(v => v && !isNaN(v));
    return valid.reduce((a, b) => a + b, 0);
}

function groupBy(arr, key) {
    return arr.reduce((acc, item) => {
        const value = item[key] || 'unknown';
        acc[value] = (acc[value] || 0) + 1;
        return acc;
    }, {});
}

// Запуск
convertExcelToJson().catch(console.error);
