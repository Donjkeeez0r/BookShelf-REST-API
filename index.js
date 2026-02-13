const http = require('node:http');
const fs = require('node:fs/promises');

const PORT = 3000;
const DB_PATH = './books.json'

let books = [];

const initDB = async () => {
    try {
        const data = await fs.readFile(DB_PATH, 'utf-8');
        books = JSON.parse(data);
    } catch (error) {
        books = [];
        await saveDB();
    }
};

const saveDB = async () => {
    await fs.writeFile(DB_PATH, JSON.stringify(books, null, 2));
};

const server = http.createServer(async (request, response) => {
    if (request.method === 'GET' && request.url === '/') {
        try {
            const data = await fs.readFile('./index.html');
            response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            response.end(data);
        } catch (err) {
            response.statusCode = 404;
            response.end('Файл не был обнаружен!');
        }
    }
    else if (request.method === 'GET' && request.url.startsWith('/books')) {
        const fullUrl = new URL(request.url, `http://${request.headers.host}`);
        
        if (fullUrl.pathname === '/books') {
            const categoryFilter = fullUrl.searchParams.get('category');

            const dataToSend = categoryFilter
                ? books.filter(b => b.category === categoryFilter)
                : books;

            response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            response.end(JSON.stringify(dataToSend));
        }
    }
    else if (request.method === 'POST' && request.url === '/books') {
        const chunks = [];

        request.on('data', (chunk) => {
            chunks.push(chunk);
        });

        request.on('end', async () => {
            try {
                const bufferStr = Buffer.concat(chunks).toString();
                const newBook = JSON.parse(bufferStr);

                if (!newBook.title || newBook.title.trim() === '' ||
                    !newBook.author || newBook.author.trim() === '' ||
                    !newBook.category || newBook.category.trim() === '') {

                        response.statusCode = 400;
                        return response.end('Ошибка: Название, автор и категория обязательны!');
                }

                newBook.id = Date.now();
                newBook.isRead = false;

                books.push(newBook);

                await saveDB();

                response.statusCode = 201;
                response.end('Новая книга успешно добавлена');
            } catch (error) {
                response.statusCode = 400;
                response.end('Ошибка в формате данных!');
            }
        })
    }
    else if (request.method === 'PUT' && request.url.startsWith('/books/')) {
        try {
            const idRaw = request.url.split('/')[2];
            const idBook = parseInt(idRaw);

            const findBook = books.find(b => b.id === idBook);
            if (!findBook) {
                response.statusCode = 404;
                return response.end('Такой книги не нашлось!');
            }
        
            findBook.isRead = true;
            await saveDB()
            response.statusCode = 200;
            response.end('Статус книги обновлен!');
        } catch (error) {
            response.statusCode = 500;
            response.end('Ошибка на стороне сервера')
        }
        
    }
    else if (request.method === 'DELETE' && request.url.startsWith('/books/')) {
        try {
            const idRaw = request.url.split('/')[2];
            const idBook = parseInt(idRaw);

            const bookIndex = books.findIndex(b => b.id === idBook);

            if (bookIndex === -1) {
                response.statusCode = 404;
                return response.end('Книги с таким ID нету!');
            }

            books.splice(bookIndex, 1);
            await saveDB();

            response.statusCode = 200;
            response.end('Книга успешно удалена!');
        } catch (err) {
            response.statusCode = 500;
            response.end('Ошибка на стороне сервера')
        }
    }
    else {
        response.statusCode = 404;
        response.end('Ничего не найдено!');
    }
});

const start = async () => {
    try {
        await initDB();
        console.log('База данных успешно загружена!');

        server.listen(PORT, () => {
            console.log(`Сервер был запущен на http://localhost:${PORT}`);
        });
    } catch (err) {
        console.log('Ошибка при запуске сервера: ', err);
    }
};

start();