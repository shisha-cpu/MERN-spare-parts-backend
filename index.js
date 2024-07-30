import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import UserModel from './models/user.js'; // убедитесь, что путь к модели корректен
import data from './data.json'assert { type: "json" };
import cors from 'cors'
import nodemailer from 'nodemailer';

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
// Маршрут для регистрации пользователей
app.post('/register',

    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, email, password , phone} = req.body;

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

// Маршрут для входа пользователей
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

app.post('/add-to-basket' , async(req , res )=>{
    const { username, product } = req.body;

    if (!username || !product) {
        return res.status(400).send({ message: 'Username and product are required' });
    }

    try {
        const user = await UserModel.findOne({ username });

        if (!user) {
            return res.status(404).send({message: 'Пользователь не найден '})
        }

        user.basket.push(product);
        await user.save();

        res.status(200).send({ message: 'Product added to basket', basket: user.basket });
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: 'Server error' });
    }

})
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
    const { username } = req.body;

    try {
        const user = await UserModel.findOne({ username });

        if (!user) {
            console.log(`User ${username} not found`);
            return res.status(404).json({ message: 'User not found' });
        }

        // Очистка корзины
        user.basket = [];
        await user.save();

        res.status(200).json({ message: 'Order placed successfully' });
    } catch (err) {
        console.error('Error placing order:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

app.delete('clear-order' , (req , res )=>{

})
const PORT = process.env.PORT || 4444;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
