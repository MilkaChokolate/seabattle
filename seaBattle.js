/*
 *Настройка размера поля и караблей
*/
const gameFieldBorderX = ['А','Б','В','Г','Д','Е','Ж','З','И','К'];
const gameFieldBorderY = ['1','2','3','4','5','6','7','8','9','10'];
const shipsConfiguration = [
    {maxShips: 1, pointCount: 4},
    {maxShips: 2, pointCount: 3},
    {maxShips: 3, pointCount: 2},
    {maxShips: 4, pointCount: 1}
];

const CELL_EMPTY = 0;
const CELL_WITH_SHIP = 1;
let hitsForWin = 0;
let ai2ShipsMap = null;
let ai1ShipsMap = null;
let ai2ShotMap = null;
let ai1ShotMap = null;
let ai1Hits = 0;
let ai2Hits = 0;
let gameStopped = false;
let winnerList = {
    'AI1':0,
    'AI2':0
}
/*
 *Переменные для логирования хода игры
*/
// let ai1StepCount = 0;
// let ai12tepCount = 0;
// let ai1ShotCount = 0;
// let ai2ShotCount = 0;


/**
 * Установка выигрышного количества попаданий
*/
for(let i = 0; i < shipsConfiguration.length; i++){
    hitsForWin = +hitsForWin + (shipsConfiguration[i].maxShips * shipsConfiguration[i].pointCount);
}


/**
 * Проверка, возможно ли разместить тут однопалубный корабль
*/
function isPointFree(map, xPoint, yPoint){
    // текущая и далее по часовой стрелке вокруг
    if(map[yPoint][xPoint] === CELL_EMPTY
        && map[yPoint-1][xPoint] === CELL_EMPTY
        && map[yPoint-1][xPoint+1] === CELL_EMPTY
        && map[yPoint][xPoint+1] === CELL_EMPTY
        && map[yPoint+1][xPoint+1] === CELL_EMPTY
        && map[yPoint+1][xPoint] === CELL_EMPTY
        && map[yPoint+1][xPoint-1] === CELL_EMPTY
        && map[yPoint][xPoint-1] === CELL_EMPTY
        && map[yPoint-1][xPoint-1] === CELL_EMPTY
    ){
        return true;
    }
    return false;
}


/*
 * Генерация рандомного числа
*/
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}


/**
 * Возможно ли вставить корабль вертикально
   * @param {Array} map
   * @param {Number} xPoint
   * @param {Number} yPoint
   * @param {Number} shipLength
   * @param {Number} coordLength
   * @return {Boolean}
 */
function canPutVertical(map, xPoint, yPoint, shipLength, coordLength){
    var freePoints = 0;
    for(let y = yPoint; y < coordLength; y++){
        // текущая и далее по часовой стрелке в вертикальном направлении
        if(map[y][xPoint] === CELL_EMPTY
            && map[y+1][xPoint] === CELL_EMPTY
            && map[y+1][xPoint+1] === CELL_EMPTY
            && map[y+1][xPoint] === CELL_EMPTY
            && map[y][xPoint-1] === CELL_EMPTY
            && map[y-1][xPoint-1] === CELL_EMPTY
        ){
            freePoints++;
        }else{
            break;
        }
    }
    return freePoints >= shipLength;
}


/**
 * Возможно вставки корабля горизонтально
   * @param {Array} map
   * @param {Number} xPoint
   * @param {Number} yPoint
   * @param {Number} shipLength
   * @param {Number} coordLength
   * @return {Boolean}
 */
function canPutHorizontal(map, xPoint, yPoint, shipLength, coordLength){
    var freePoints = 0;
    for(let x = xPoint; x < coordLength; x++){
        // текущая и далее по часовой стрелке в горизоньтальном направлении
        if(map[yPoint][x] === CELL_EMPTY
            && map[yPoint-1][x] === CELL_EMPTY
            && map[yPoint-1][x+1] === CELL_EMPTY
            && map[yPoint][x+1] === CELL_EMPTY
            && map[yPoint+1][x+1] === CELL_EMPTY
            && map[yPoint+1][x] === CELL_EMPTY
        ){
            freePoints++;
        }else{
            break;
        }
    }
    return freePoints >= shipLength;
}


/**
 * Генерация рандомного поля с расположенными на нем корабликами
 */
function generateRandomShipMap(){
    let map = [];
    // генерация карты расположения, вклчающей отрицательный координаты
    // для возможности размещения у границ
    for(let yPoint = -1; yPoint < (gameFieldBorderY.length + 1); yPoint++){
        for(let xPoint = -1; xPoint < (gameFieldBorderX.length + 1); xPoint++){
            if(!map[yPoint]){
                map[yPoint] = [];
            }
            map[yPoint][xPoint] = CELL_EMPTY;
        }
    }
    // получение копии настроек кораблей для дальнейших манипуляций
    let shipsConfigurationCopy= JSON.parse(JSON.stringify(shipsConfiguration));
    let allShipsPlaced = false;
    while(allShipsPlaced === false){
        let xPoint = getRandomInt(0, gameFieldBorderX.length);
        let yPoint = getRandomInt(0, gameFieldBorderY.length);
        if(isPointFree(map, xPoint, yPoint) === true){
            if(canPutHorizontal(map, xPoint, yPoint, shipsConfigurationCopy[0].pointCount, gameFieldBorderX.length)){
                for(let i = 0; i < shipsConfigurationCopy[0].pointCount;i++){
                    map[yPoint][xPoint + i] = CELL_WITH_SHIP;
                }
            }else if(canPutVertical(map, xPoint, yPoint, shipsConfigurationCopy[0].pointCount, gameFieldBorderY.length)){
                for(let i = 0; i < shipsConfigurationCopy[0].pointCount; i++){
                    map[yPoint + i][xPoint] = CELL_WITH_SHIP;
                }
            }else{
                continue;
            }

            // обоновление настроек кораблей, если цикл не был пропущен
            // и корабль стало быть расставлен
            shipsConfigurationCopy[0].maxShips--;
            if(shipsConfigurationCopy[0].maxShips < 1){
                shipsConfigurationCopy.splice(0, 1);
            }
            if(shipsConfigurationCopy.length === 0){
                allShipsPlaced = true;
            }
        }
    }
    return map;
    
}


/**
 * Создает массив с координатами полей, из которых AI1 случайно выбирает координаты для обстрела
 */
function generateAI1ShotMap(){
    let map = [];
    for(let yPoint = 0; yPoint < gameFieldBorderY.length; yPoint++){
        for(let xPoint = 0; xPoint < gameFieldBorderX.length; xPoint++){
            map.push({y: yPoint, x: xPoint});
        }
    }
    return map;
}

/**
 * Создает массив с координатами обстрела для AI2 по спирали
 * @param {Number} r0 стартовая точка по строке
 * @param {Number} c0 стартовая точка по столбцу
 * 
 */
function generateAI2ShotMap(r0, c0) {
    let offset = 1, cLimit = c0+offset, rLimit = r0+offset
    let i = r0, j = c0
    let res = []
    
    while(res.length < gameFieldBorderX.length * gameFieldBorderY.length){
		//если i и j находятся в пределах границ матрицы и до res
        if(i>=0 && j>=0 && i<10 && j<10){  
            res.push({y:i, x:j})
        }
        // если i и j равны их соответствующим пределам, увеличьте смещение до следующей длины спирали и направления
        if(i == rLimit && cLimit == j){ 
            offset = offset<0 ? offset-1 : offset+1
            offset *= -1
            cLimit = cLimit + offset
            rLimit = rLimit + offset
        }
        // каждое из четырех возможных перемещений по матрице
        if(j<cLimit) j++
        else if(i<rLimit) i++
        else if(j>cLimit) j--
        else if(i>rLimit) i--
    }
    // Возвращается reserse массив из-за того метод pop быстрее shift
    return res.reverse()
};


/**
 * Ход AI2
 */
function ai2Fire(){
    if(gameStopped){
        return;
    }
    // берется выстрел из заранее сгенерированой карты и затем удаляется чтобы не было выстрелов повторных
    let spiralShot = ai2ShotMap[ai2ShotMap.length-1];
    ai2ShotMap.pop();
    // ai2ShotCount++;
    // console.log('выстрел AI2 # '+ ai2ShotCount);
    if(ai1ShipsMap[spiralShot['y']][spiralShot['x']] === CELL_EMPTY){
        // console.log('AI2 промахнулся')
        ai1Fire();
    }else{
        //console.log('AI2 попал')
        ai2Hits++;
        if(ai2Hits >= hitsForWin){
            stopGame('AI2');
        }else{
            ai2Fire();
        }
    }
}


/**
 * Ход AI1
 */
function ai1Fire(){
    if(gameStopped){
        return;
    }
    // берется случайный выстрел из сгенерированной ранее карты и затем удаляется чтобы не было выстрелов повторных
    let randomShotIndex = getRandomInt(0, ai1ShotMap.length);
    let randomShot = JSON.parse(JSON.stringify(ai1ShotMap[randomShotIndex]));
    ai1ShotMap.splice(randomShotIndex, 1);

    //ai1ShotCount++;
    //console.log('выстрел AI1 # '+ ai1ShotCount);

    if(ai2ShipsMap[randomShot.y][randomShot.x] === CELL_EMPTY){
        // console.log('AI1 промахнулся')
        ai2Fire()
    }else{
        //console.log('AI1 попал')
        ai1Hits++;
        if(ai1Hits >= hitsForWin){
            stopGame("AI1");
        }else{
            ai1Fire();
        }
    }
    
    
}


/**
 * Остановка игры, учет победителя
 * @param {string} winner
 */
function stopGame(winner){
    gameStopped = true;
    ai1Going = false;
    // console.log('игра завершилась победой '+ winner)
    winnerList[winner]++
}


/**
 * Начало новой игры, обнуление счетчиков
 * @param {String} firstMove кто ходит первый
 */
function startNewGame(firstMove){
    ai2ShipsMap = generateRandomShipMap();
    ai1ShipsMap = generateRandomShipMap();
    ai1ShotMap = generateAI1ShotMap();
    ai2ShotMap = generateAI2ShotMap(5,5);
    ai1Hits = 0;
    ai2Hits = 0;
    gameStopped = false;
    ai1StepCount = 0;
    ai2StepCount = 0;
    ai1ShotCount = 0;
    ai2ShotCount = 0;
    if (firstMove==='AI1'){
        ai1Fire();
    }else{
        ai2Fire();
    }
    
}

/**
 * Вызов функции 1000 раз
 */
for(let i = 0; i < 1000; i++){ 
   startNewGame('AI1')
}

console.log('Побед AI1: '+ winnerList['AI1'] + ' / Побед AI2: '+ winnerList['AI2'])
