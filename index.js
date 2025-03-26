import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import UserModel from './models/user.js'; // убедитесь, что путь к модели корректен
import data from './data.json'assert { type: "json" };
import cors from 'cors'
import nodemailer from 'nodemailer';

import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';
mongoose 
.connect('mongodb+srv://admin:wwwwww@cluster0.weppimj.mongodb.net/spare?retryWrites=true&w=majority&appName=Cluster0' ) 
.then(()=> console.log('DB okey')) 
.catch((err)=> console.log('db error' , err))


const app = express();
app.use(express.json());
app.use(cors())
const SECRET_KEY = '4dcd4da582546078d6a3573ca9c7e528655f35157e2e5c2da411d9264ff0cf5d114ad2e897fcc8621e9a13a32be2063beff5b1602ec88f31e4334c774eaf9857a0500a561f29ab1b57f15a1562944aa6418f0283145d7690efabfe10f37011d587092d1a70c8683ef94e19c7d45d6a8582fb768a9be56b00e595a06766e967aae9371fc2864fca4f55ffad353d7bf3e015f9a0cb6e4b38fd5c662eaf99f19f4234781b6804c3441dde602b89bf0d2bf753ecd04a3167f6b772b8ca7de3d054282ccccf62857f0304b4968094ef019d0286009bdf5dbbc0c37e6a109aed76391bce60c676d499577ac0ab581aa46de06c67bd538e2e2b202f072647aac3be9426'; // замените на ваш секретный ключ
app.get('/data', (req, res) => {
    res.json(data); // Send data as JSON response
});

app.post('/register',

    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, email, password, phone } = req.body;

        // Проверка на наличие пароля
        if (!password) {
            return res.status(400).json({ message: 'Password is required' });
        }

        try {
            // Проверка на существование пользователя с таким же email или username
            const existingUser = await UserModel.findOne({ $or: [{ email }, { username }] });
            if (existingUser) {
                return res.status(400).json({ message: 'Username or email already taken' });
            }

            // Хэширование пароля
            const hashedPassword = await bcrypt.hash(password, 10);

            const newUser = new UserModel({
                username,
                email,
                password: hashedPassword,
                phone
            });

            await newUser.save();

            res.status(201).json({ message: 'User registered successfully' });
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
);
app.post('/api/send-order', async (req, res) => { 
    const { username, phone, email, orderDetails, totalOrderSum } = req.body;

    try {
        // Создание Excel-файла
        const excelData = [
            ['Заказ от пользователя:', username],
            ['Телефон:', phone],
            ['Почта:', email],
            ['Общая сумма:', totalOrderSum],
            [],
            ['Артикул', 'Наименование', 'Количество', 'Цена', 'Сумма'],
            ...orderDetails.map(item => [item.article, item.name, item.count, item.price, item.total])
        ];

        const worksheet = XLSX.utils.aoa_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Order");

        // Получаем текущую дату и форматируем её
        const currentDate = new Date().toLocaleDateString("ru-RU").replace(/\./g, '_'); // форматирование "dd_mm_yyyy"
        
        // Включаем дату в имя файла
        const filePath = path.resolve(`order_${username}_${currentDate}.xlsx`);
        XLSX.writeFile(workbook, filePath);

        // Отправка файла в Telegram
        const botToken = '6905722948:AAFcLUxKVCJ1tIF03S8l2xLbjo50buyYYoU';
        const chatId = '1137493485';
        const formData = new FormData();
        formData.append("chat_id", chatId);
        formData.append("document", fs.createReadStream(filePath));

        await axios.post(`https://api.telegram.org/bot${botToken}/sendDocument`, formData, {
            headers: formData.getHeaders()
        });

        // Удаляем файл после отправки
        fs.unlinkSync(filePath);

        res.json({ success: true });
    } catch (error) {
        console.error('Error in send-order:', error);
        res.status(500).json({ success: false, message: 'Ошибка при отправке заказа' });
    }
    
});

// app.delete('/:email/basket', async (req, res) => {
//     const { email } = req.params;
//     const user = await UserModel.findOne({ email }); 
//     if (user) {
//         user.basket = [];
//         await user.save(); 
//         res.send({ message: 'Корзина успешно очищена' });
//     } else {
//         res.status(404).send({ message: 'Пользователь не найден' });
//     }
// });


app.post('/login',
    // Проверка и валидация входных данных
    body('email').isEmail().withMessage('Invalid email address'),
    body('password').exists().withMessage('Password is required'),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        try {
            // Поиск пользователя по email
            const user = await UserModel.findOne({ email });
            if (!user) {
                return res.status(400).json({ message: 'Invalid email or password' });
            }

            // Проверка пароля
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({ message: 'Invalid email or password' });
            }

            // Создание JWT токена
            const token = jwt.sign(
                { userId: user._id, username: user.username },
                SECRET_KEY,
                { expiresIn: '1h' }
            );

            res.status(200).json(user);
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
);
app.post('/add-to-basket', async (req, res) => {
    const { username, product, count } = req.body;

    if (!username || !product || !Number.isInteger(count) || count <= 0) {
        return res.status(400).send({ message: 'Username, product, and valid count are required' });
    }

    try {
        const user = await UserModel.findOne({ username });
        if (!user) return res.status(404).send({ message: 'User not found' });

        const existingItem = user.basket.find(item => item.product.id === product.id);

        if (existingItem) {
            existingItem.count += count;
            console.log(`Updated product ${product.id} count to ${existingItem.count}`);
        } else {
            user.basket.push({ product, count });
            console.log(`Added new product ${product.id} to basket`);
        }

        await user.save();
        console.log('Basket successfully saved to database.');
        res.status(200).send({ message: 'Product added to basket', basket: user.basket });
    } catch (error) {
        console.error('Error adding product to basket:', error);
        res.status(500).send({ message: 'Internal server error' });
    }
});



  
app.get('/user/:username/basket', async (req, res) => {
    try {
        const { username } = req.params;
        const user = await UserModel.findOne({ username });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user.basket);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});
app.get('/user/:username/clear-basket', async (req, res) => {
    try {
        const { username } = req.params;
        const user = await UserModel.findOne({ username });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        user.basket = []
        res.json(user.basket);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.delete('/:username/basket/:index', async (req, res) => {
    const { username, index } = req.params;

    try {
        // Найдите пользователя по имени
        const user = await UserModel.findOne({ username });
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        // Проверьте, что индекс допустим
        if (index < 0 || index >= user.basket.length) {
            return res.status(400).json({ message: 'Неверный индекс' });
        }

        // Удалите элемент из корзины
        user.basket.splice(index, 1);

        // Сохраните изменения
        await user.save();

        res.status(200).json({ message: 'Товар успешно удален из корзины' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при удалении товара из корзины', error });
    }
});

app.post('/get-order', async (req, res) => {
    const { email } = req.body;

    try {
        const user = await UserModel.findOne({ email });

        if (!user) {
            console.log(`User ${email} not found`);
            return res.status(404).json({ message: 'User not found' });
        }

        // Сохранение заказа в истории заказов
        user.orderHistory.push({
            products: [...user.basket], // Копируем текущие элементы из корзины
            orderDate: new Date()
        });

        // Очистка корзины
        user.basket = [];
        await user.save();

        res.status(200).json({ message: 'Order placed successfully', orderHistory: user.orderHistory });
    } catch (err) {
        console.error('Error placing order:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

app.put('/user/:username/update', async (req, res) => {
    const { username } = req.params;
    const { email, phone, newUsername } = req.body; // Добавляем newUsername для изменения имени

    try {
        const user = await UserModel.findOne({ username });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Обновляем данные
        if (email) {
            user.email = email;
        }
        if (phone) {
            user.phone = phone;
        }
        if (newUsername) {
            user.username = newUsername; 
        }

        await user.save();
        res.status(200).json({ message: 'User details updated successfully', user });
    } catch (error) {
        console.error('Error updating user details:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.get('/user/:username/order-history', async (req, res) => {
    try {
        const { username } = req.params;
        const user = await UserModel.findOne({ username });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user.orderHistory);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.put('/:username/basket/:index/increase', async (req, res) => {
    const { username, index } = req.params;

    try {
        const user = await UserModel.findOne({ username });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (index < 0 || index >= user.basket.length) {
            return res.status(400).json({ message: 'Invalid basket index' });
        }

        user.basket[index].count += 1;

        await user.save();
        res.status(200).json({ message: 'Product count increased', basket: user.basket });
    } catch (error) {
        console.error('Error increasing product count:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.put('/:username/basket/:index/decrease', async (req, res) => {
    const { username, index } = req.params;

    try {
        const user = await UserModel.findOne({ username });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (index < 0 || index >= user.basket.length) {
            return res.status(400).json({ message: 'Invalid basket index' });
        }

        if (user.basket[index].count > 1) {
            user.basket[index].count -= 1;
        } else {
            return res.status(400).json({ message: 'Product count cannot be less than 1' });
        }

        await user.save();
        res.status(200).json({ message: 'Product count decreased', basket: user.basket });
    } catch (error) {
        console.error('Error decreasing product count:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.put('/:username/basket/:index', async (req, res) => {
    const { username, index } = req.params;
    const { count } = req.body;

    if (count < 1) {
        return res.status(400).json({ message: 'Количество не может быть меньше 1' });
    }

    try {
        const user = await UserModel.findOne({ username });
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

      
        if (index < 0 || index >= user.basket.length) {
            return res.status(400).json({ message: 'Неверный индекс' });
        }

       
        user.basket[index].count = count;


        await user.save();

        res.status(200).json({ message: 'Количество товара обновлено' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при обновлении количества товара', error });
    }
});







app.use(express.static(path.join(__dirname, 'client', 'build')));


app.get('*', (req, res, next) => { 
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'client', 'build', 'index.html'));
  } else {
    next(); 
  }
});


app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    res.status(404).json({ error: 'Not found' });
  }
  
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Server error' });
});

const PORT = process.env.PORT || 4445;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});