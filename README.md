# Nullboard frontend

Простий фронтенд для REST API анонімного форуму Nullboard (бекенд на Django REST Framework, репозиторій `nullboard`). Показує список дошок, стрічку тредів із сортуванням і сторінку треда з відповідями. Без фреймворків і збірки: чистий HTML, CSS і JavaScript (`fetch`). Тема оформлення: Omarchy "Osaka Jade".

## Як запустити проєкт

1. Запустити бекенд (репозиторій `nullboard`, поруч із цією папкою):

   ```bash
   cd ../nullboard
   python manage.py migrate
   python manage.py runserver 8000
   ```

2. В іншому терміналі віддати цю папку статичним сервером на порту 3000:

   ```bash
   cd nullboard-frontend
   python -m http.server 3000
   ```

3. Відкрити http://localhost:3000 у браузері.

- Frontend: http://localhost:3000
- Backend: http://127.0.0.1:8000 (API: http://127.0.0.1:8000/api/v1)

Порт 3000 обов'язковий: CORS на бекенді дозволяє запити лише з `http://localhost:3000` і `http://127.0.0.1:3000`. Якщо бекенд не запущено, сторінка покаже помилку "API at http://127.0.0.1:8000 is not running."

## Структура

- `index.html` - розмітка сторінки
- `css/style.css` - стилі (палітра як CSS custom properties)
- `js/app.js` - завантаження даних з API і побудова DOM через `textContent`
