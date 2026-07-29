
Перед початком роботи
git pull --rebase origin main //свіжі зміни з віддаленого репозиторію

Наприкінці робочої сесії
git add .
git commit -m "короткий опис зробленого"
git push origin main


Тимчасова гілка
git checkout -b feature/my-work
git add .
git commit -m "wip: незавершена робота"
git push -u origin feature/my-work

git fetch origin
git checkout feature/my-work



Старт системи
npm run dev // запускати двічі

Оновлення node_modules
npm install
