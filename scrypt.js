import fs from 'fs'; 
import xlsx from 'xlsx';

// Путь к файлу
const filePath = './Файл топ для сайта.xlsx';

// Чтение Excel файла
const workbook = xlsx.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

// Преобразование данных в JSON
const data = xlsx.utils.sheet_to_json(sheet);

// Отладочная информация
console.log(data);


const filteredData = data.map((item, index) => ({
  'id': item['Нумерация для сортировки'], // Добавление уникального идентификатора
  'Каталог': item['Каталог'] || 'Н/Д',
  'Артикул': item['Артикул'] || 'Н/Д',
  'Производитель': item['Производитель'] || 'Н/Д',
  'Наименование': item['Наименование'] || 'Н/Д', // Это имя для сайта
  'Наименование_заказа': item["Наименование\r\nпод артикул 1с"]?.trim() || 'Н/Д',
  'Количество': item['Кол-во на складе'] || 'Н/Д',
  'ОПТ': item['Цена ОПТ'] || 'Н/Д',
  'РОЗНИЦА': item['Цена РОЗНИЦА'] || 'Н/Д'
}));

// Сохранение отфильтрованных данных в файл JSON
fs.writeFileSync('./data.json', JSON.stringify(filteredData, null, 2), 'utf8');
console.log('Файл data.json создан.');

