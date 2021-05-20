'use strict';
var uid;
var gameDiv;
window.addEventListener("load", function(event) {
    gameDiv = document.getElementById('gameDiv');
    uid = sessionStorage.getItem('uid');
    if(!uid){
    let name=prompt("enter your name");
    sessionStorage.setItem('uid',name);
}
  });
var gm;
var startBtn = document.getElementById('startBtn')
startBtn.addEventListener("click", startGame);
function startGame(){
    startBtn.disabled = true;
    startBtn.hidden = true;
    if(gm == undefined)
        gm = new GameManager();
    else
        return;
    let me = new Player(uid, 100);
    document.getElementById('money').innerText = '100';
    let bot = new Player("bot", 100);
    gm.joinPlayer(bot,100);
    gm.joinPlayer(me,100);

}
var callBtn = document.getElementById('callBtn');
var raiseBtn = document.getElementById('raiseBtn');
var foldBtn = document.getElementById('foldBtn');
//raiseBtn.addEventListener("click",)
//foldBtn.addEventListener("click",)
class CardDeck {
    //카드덱은 스페이드 다이아 하트 클로버 13장씩 52장.
    //홀덤에서 무늬간 서열은 인정하지 않으나 그래도 아이디는 정해야하므로 스페이드부터 0~12, 다이아는 13~25, ...로 번호 할당.
    constructor(){
        this.cards = new Array(52);
        //뽑은 카드를 관리하는 이유: Reset시 새 카드 배열을 만들지 않고 뽑은 카드들을 push시켜서 GC가 자주 일어나지 않게 하기 위함.
        this.drawnCards = new Array(52);
        let i;
        for(i=0; i<52; i++){
            this.cards[i] = i;
            this.drawnCards[i]=null;
        }
        this.shuffle();
        this.index = 0;
    }
    //Knuth Shuffle 알고리즘 사용.
    shuffle(){
        let swapbuffer;
        let i;
        let r;
        for(i=0; i<51; i++)  
        {
            //random 범위 i to 51
            r=Math.floor(Math.random()*(52-i)+i)
            swapbuffer = this.cards[i];
            this.cards[i] = this.cards[r];
            this.cards[r] = swapbuffer;
        }
    }
    //카드를 한장 뽑아서 리턴값으로
    Draw(){
        if(this.index>this.cards.length)
        {
            return null;
        }
        this.drawnCards[this.index]=this.cards[this.index];
        this.cards[this.index]=null;
        this.index ++;
        return this.drawnCards[this.index-1]
    }
    //뽑았던 카드를 돌려놓고 섞음.
    Reset(){
        let i;
        for(i=0; this.cards[i]==null; i++)
        {
            this.cards[i]=this.drawnCards[i];
            this.drawnCards[i]=null;
        }
        this.index = 0;
    }
}
class Card{
    constructor(id){
        this.id = id;
        //a=14, 2=2, ... j=11, q=12, k=13
        this.rank = id%13+1;
        this.suit = Math.floor(id/13);
        if(this.rank == 1){
            this.rank = 14;
        }
    }
}
//random성 테스트용 함수.
function DeckTest(times)
{
    let i;
    let resultTable = new Array(52);
    for(i=0; i<52; i++){
        resultTable[i] = 0;
    }
    for(i=0; i<times; i++){
        //카드덱을 생성해서 첫장만 확인
        let testDeck = new CardDeck();
        resultTable[testDeck.Draw()]++;
    }

    let table = document.createElement("table");
    let tbody = document.createElement("tbody");
    for(i=0; i<52; i++)
    {
        let tr=document.createElement("tr");
        let td1=document.createElement("td");
        let td2=document.createElement("td");
        td1.appendChild(document.createTextNode(i));
        td2.appendChild(document.createTextNode(resultTable[i]));
        tr.appendChild(td1);
        tr.appendChild(td2);
        tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    let game_div=document.getElementById("gameDiv");
    game_div.appendChild(table);
}
//대체로 랜덤함을 확인
//DeckTest(10000);

//evalTest([13,0,17,19,21,28,48])
//판별함수 테스트용
function evalTest(idlist){
    let cardlist = [];
    idlist.forEach(function(v){cardlist.push(new Card(v))});
    cardlist.forEach(function(v){console.log(v.rank)})
    let result = handsEvaluator(cardlist);
    console.log(result);
}
//덱 관리, 카드 돌리기, 플레이어 요청 검증 등 전반사항을 처리
class GameManager{
    constructor(max_p, max_s, baseEnty){
        //사용할 카드덱.
        this.cardDeck = new CardDeck();
        //커뮤니티 카드판(공용 카드).
        this.board=new Array(5);
        //쌓인 판돈
        this.pot = 0;
        //기본 엔티
        if(baseEnty == undefined){
            this.baseEnty = 10;
        } else {
            this.baseEnty = baseEnty;
        }
        //현재 가장 많은 베팅액수
        this.maxBet = 0;
        //게임에 참여중인 플레이어 리스트.
        this.playerList = [];
        this.playerCount =0;
        //최대 게임 참가 인원수
        if(max_p == undefined){
            this.maxPlayer = 8;
        } else
            this.maxPlayer  = max_p;
        
            //dealer 포지션이 누구인가를 가리키는 인덱스.
        this.dealerIndex;
        //관전중인 대기자 리스트.
        this.spectatorlist = [];
        //최대 관전자 인원수
        if(max_s == undefined){
            this.maxSpectator = 16;
        } else
            this.maxSpectator =max_s;
        //게임 참가를 원하는 대기자 리스트
        this.waitinglist = [];
        //게임의 진행상황. 프리플랍 0, 플랍 1, 턴 2, 리버 3.
        this.game_phase = 0;
    }
    //참여 요청시 일단은 관전자로 참여.
    joinPlayer(player){
        if(this.spectatorlist.length<this.maxSpectator){
            this.spectatorlist.push(player);
            player.status=playerStatusEnum.spectate;
            //TODO. 별도의 버튼으로 게임에 참가를 요청하게 해야함.
            this.playerReqImin(player);
            //TODO. 레디 버튼을 따로 만들어 시작하도록 해야 함.
            this.playerReqStart(player);
        } else {
            //TODO. 거부 메시지
        }
    }
    playerReqImin(player){
        let i=this.spectatorlist.indexOf(player)
        if(i<0){
            alert(player.id +'not exist.');
            return;
        }
        this.spectatorlist.splice(i,1);
        if(this.game_phase!=0){
            this.waitinglist.push(player);
            player.status=playerStatusEnum.imin;
        } else {
            if(this.dealerIndex==undefined){
                this.dealerIndex = Math.floor(Math.random()*this.playerCount);
            }
            this.playerCount++;
            this.playerList.splice((this.dealerIndex+1)%this.maxPlayer, 0, player)
            player.status=playerStatusEnum.notready;
        }
    }
    playerReqStart(player){
        let i;
        if(this.game_phase != 0){
            return;
        }
        player.status=playerStatusEnum.ready;
        let startReqCount=0;
        for(i=0; i<this.playerCount; i++){
            if(this.playerList[i].status==playerStatusEnum.ready){
                startReqCount++;
            }
        }
        //TODO. 전원이 준비가 안되어도 최소 인원이 준비하면 몇초의 카운트다운 후 시작하게 변경해야함.
        if(startReqCount == this.playerCount && this.playerCount>1){
            this.nextPhase();
        }
    }

    //대기자들이 테이블에 참여
    seatTable(){
        if(this.maxPlayer-this.playerCount > 0){
            if(dealerIndex==undefined){
                this.dealerIndex = Math.floor(Math.random()*this.playerCount);
            }
            let newplayers=this.waitinglist.splice(0, this.maxPlayer-this.playerCount)
            let i;
            let count = newplayers.length;
            for(i=0; i<count; i++){
                this.playerList.splice((this.dealerIndex+i+1)%this.maxPlayer,0, newplayers[i])
                this.playerCount ++;
                if(this.playerCount == this.maxPlayer){
                    break;
                }
            }
        }
    }
    //다음 페이즈로 넘어가기 요청. 각 페이즈마다 해당 작업을 하고 phase에 1 더함.
    async nextPhase(){
        switch(this.game_phase){
            //프리플랍
            case 0:
                if(this.gatherEnty(this.baseEnty)){
                    this.maxBet = this.baseEnty;
                    this.dealingCards();
                    await this.animate_dealing();
                    console.log('end animate')
                    this.takeActions();
                    this.game_phase++;
                }
                break;
            //플랍
            case 1:
                
                
                break;
            //턴
            case 2:

                break;
            //리버
            case 3:

                this.game_phase==0;
                break;
            
        }
        this.game_phase++;
    }
    //참가비 거두기 return true or false
    gatherEnty(amount){
        let count=this.playerList.length;
        let temppot = 0;
        let i;
        for(i=0;i<count; i++){
            if(this.playerList[i].money>=amount){
                this.playerList[i].money-=amount;
                this.playerList[i].reserved = amount;
                temppot+=amount;
            } else {    //참가비가 모자란 플레이어가 있으면 빼고 시작.
                this.playerList.splice(i,1);
            }
        }
        //참가자가 둘 이상이어야 더 이상 진행가능.
        count=this.playerList.length
        if(count>=2){
            this.pot = temppot;
            let p = this.getPlayer(uid)
            //플레이어들을 상태 업데이트.
            this.playerList.forEach(function(v){
                v.status = playerStatusEnum.playing;
            })
            document.getElementById('money').innerText = p.money;
            return true;
        } else {
            //진행조건이 안맞으면 돈 돌려주고 진행 멈춤.
            for(i=0; i<count; i++){
                this.playerList[i].money+=reserved;
                this.playerList[i].reserved=0;
            }
            return false;
        }
    }
    //리턴 true/false. 선행조건도 충족하고 해당기능도 성공적으로 수행한 경우 true;
    dealingCards(){
        let count=this.playerList.length;
        let i;
        //딜러부터 한장씩 두번 돌림.
        for(i=this.dealerIndex; i<count; i++){
            this.playerList[i].getCard1(this.cardDeck.Draw());
        }
        for(i=0; i<this.dealerIndex; i++){
            this.playerList[i].getCard1(this.cardDeck.Draw());
        }
        //두번째 카드
        for(i=this.dealerIndex; i<count; i++){
            this.playerList[i].getCard2(this.cardDeck.Draw());
        }
        for(i=0; i<this.dealerIndex; i++){
            this.playerList[i].getCard2(this.cardDeck.Draw());
        }
    }
    //플레이어들의 액션을 받음.
    takeActions(){
        let i;
        //딜러 다음 사람이 0번 인덱스, 딜러가 가장 마지막으로 정렬.
        let actionSortPlayerList;
        actionSortPlayerList=this.playerList.slice(this.dealerIndex+1, this.playerList.length);
        actionSortPlayerList= actionSortPlayerList.concat(this.playerList.slice(0,this.dealerIndex+1));
        console.log(actionSortPlayerList);
        for(i=0; i<actionSortPlayerList.length; i++){
            //봇이면 콜 하고 끝.
            if(actionSortPlayerList[i].id.slice(3) == 'bot'){
                actionSortPlayerList[i].actCall()
                continue;
            }
            //플레이어 본인일 경우 시간제한 30초 주고 결정을 기다림. 시간안에 결정 못하면 fold 처리.
            else if(actionSortPlayerList[i].id == uid){
                actionSortPlayerList[i].id = uid;
                this.waitAction(actionSortPlayerList[i])
                deactivateActionButton();
            }
        }
        
    }
    async waitAction(player){
        
        let timeoutPromise = new Promise((resolve,reject)=>{
            let timeout = setTimeout(function(){
                player.actFold();
                resolve(playerActionEnum.actFold)
            },10000);
        });
        let clickPromise = new Promise((resolve, reject)=>{
            callBtn.addEventListener('click', function(){
                player.actCall();
                resolve(playerActionEnum.actCall)
            },{once: true});
            //raise는 조금 있다가 처리
            foldBtn.addEventListener('click', function(){
                player.actFold();
                resolve(playerActionEnum.actFold)
            },{once: true});
        });
        activateActionButton();
        let ret=await Promise.race([timeoutPromise, clickPromise]);
        //alert(ret);
        return ret;
    }
    //자신의 위치는 항상 6시이며 이를 기준으로 다른사람의 자리가 정해진다.
    //playerlist에서 플레이어의 위치를 기준으로 좌우를 계산해서 오른쪽 왼쪽 리스트를 리턴
    setPosition(){
        //복사본을 만들어 원본에 영향을 주지 않고 작업.
        let tempPlayerList = this.playerList.slice();
        let pIndex = tempPlayerList.findIndex(function(v){return v.id==uid})
        let pLength = tempPlayerList.length;
        let centerIndex=Math.floor(pLength/2);
        
        while(pIndex>centerIndex){
            //앞 요소를 뒤로 보내야 가운데로 만들 수 있음.
            tempPlayerList.push(tempPlayerList.shift());
            pIndex--;
        }
        while(pIndex<centerIndex){
            //윗 요소를 앞으로 보내야 가운데로 만들 수 있음.
            tempPlayerList.unshift(tempPlayerList.pop());
            pIndex++;
        }
        let left = tempPlayerList.slice(pIndex+1, pLength);
        let right = tempPlayerList.slice(0, pIndex);
        return [right,left];
    }
    //카드 돌리기 애니메이션
    async animate_dealing(){
        //카드 돌리는 중일 때
        let positions = this.setPosition();
        let right = positions[0];
        let left = positions[1];
        //600px now
        let gameDivCss=getComputedStyle(gameDiv)
        let gameHeight = Number(gameDivCss.height.slice(0,-2));  
        let gameWidth = Number(gameDivCss.width.slice(0,-2));
        let i;
        let j;
        let x, y;
        for(j=0; j<2; j++){
            //오른쪽 사람들
            x=gameWidth-170+50*j;
            for(i=0; i<right.length; i++){
                y = (i+1)*(gameHeight/(right.length+1)) - 70;
                await animator.move(animator.newCard('r'+i+','+j), x, y);
            }
            //플레이어 본인
            x=gameWidth/2-115+115*j;
            y=gameHeight-160;
            await animator.move(animator.newCard('m'+j), x, y);

            //왼쪽 사람들
            x=20+50*j;
            for(i=0; i<left.length; i++){
                y = (i+1)*(gameHeight/right.length+1);
                await animator.move(animator.newCard('l'+i+','+j), x, y);
            }
        }
        //플레이어 본인의 카드 뒤집기
        animator.flip(document.getElementById('m0'),this.getPlayer(uid).inHands[0]);
        await animator.flip(document.getElementById('m1'),this.getPlayer(uid).inHands[1]);
        
        return true;
    }
    getPlayer(id){
        let index=this.playerList.findIndex(function(player){
            return player.id == id;
        })
        return this.playerList[index];
    }
    
}
//포커 참가자
class Player{
    constructor(id,money){
        this.id = id;
        this.name = id;
        //잔고
        this.money = money;
        //걸어놓은 판돈
        this.reserved = 0;
        this.inHands = new Array(2);
        //대기중인지 플레이중인지 폴드 했는지
        //관전, 참여요청, 준비 안됨, 준비됨, 플레이중, 액션 선택중, 폴드(다이), 연결 끊김
        this.status=0;
        //액션 안함, 콜/체크, 레이즈, 폴드 
        this.action=0;
        //커뮤니티 카드 정보를 받아오는 변수
        this.board = [];
    }
    reserveEnty(amount){
        if(this.money>amount){
            money-=amount;
            this.reserved = amount;
        }
    }
    //card id를 받음
    getCard1(c){
        this.inHands[0]=c;
        console.log(this.id+","+c);
    }
    getCard2(c){
        this.inHands[1]=c;
        console.log(this.id+","+c);
    }
    //card id를 받음
    getBoard(cardList){
        //주소가 아닌 값을 복사
        this.board = cardList.slice();
    }
    //판돈을 가장 많이 건 사람의 액수를 받아옴
    getMaxBet(){
        //전역변수 gm(game manager) 참조
        return gm.maxBet;
    }
    //2장의 카드와 5장의 커뮤니티 카드를 조합하여 가장 높은 랭크의 조합을 리턴
    showMyHands(){
        return handsEvaluator(this.inHands.concat(this.board))
    }
    actCall(){
        let amount = this.getMaxBet() - this.reserved;
        this.money -= amount;
        this.reserved += amount;
        this.action = playerActionEnum.actCall;
    }
    actFold(){
        this.action = playerActionEnum.actFold;
        this.status = playerStatusEnum.fold;
    }
    actRaise(){

    }
}

//7장의 카드를 받아 5장의 가장 높은 패를 만들어 종류와 키커정보를 리턴하는 함수.
function handsEvaluator(cardlist){
    //판단 기준: 무늬, 연속 숫자, 중복 숫자 세가지를 기준으로 패의 높낮이가 정해짐.
    //족보 순위: sf, fk, fh, f, s, tk, tp, op, h 스트레이트 플러시, 포카드, 풀하우스, 플러시, 스트레이트, 쓰리카드, 투페어, 원페어, 하이카드
    //점수 업데이트는 기존 점수보다 높아야 하므로 0점보다 낮은 -1점으로 초기화
    let score=-1;
    let hands=[];
    cardlist.sort(sortCardDecrement);
    updateScore(CheckFlush(cardlist));
    updateScore(CheckStraight(cardlist));
    updateScore(CheckKind(cardlist));

    function updateScore(newScore){
        if(score<newScore[0]){
            score = newScore[0];
            hands = newScore[1];
        }
    }
    function CheckFlush(cardlist){
        let suitlist = [[],[],[],[]];
        let i;
        let j;
        for(i=0; i<7; i++){
            suitlist[cardlist[i].suit].push(cardlist[i]);
        }
        for(i=0; i<4; i++){
            let listnum = suitlist[i].length
            if(listnum>=5)
            {   //플러시는 확실. 스트레이트 플러시인가?
                let cardlist=[];
                for(j=0; j<listnum; j++){
                    cardlist.push(suitlist[i][j]);
                }
                let result = CheckStraight(cardlist);
                if(result[0]){
                    return [8,result[1]]
                } else{
                    //rank로 정렬된 상태로 받기 때문에 suitlist에도 정렬돼있고 0번부터 5번까지가 항상 가장 높은 패
                    return [5,suitlist[i].slice(0,5)]
                }
            }
        }
        //for문에서 리턴이 안되면 플러시가 아님.
        return [-1,null]
    }
    function CheckStraight(cardlist){
        //내림차순으로 정렬된 카드 리스트를 받음.
        let i;
        let j;
        let ranklist = [];
        let count=0;
        cardlist.forEach(function(v){ranklist.push(v.rank)})
        if(ranklist.includes(14)){
            ranklist.push(1);
        }
        //숫자만 가지고 스트레이트인지 따지는 함수이기 때문에 중복값을 제거하는편이 계산하기 편함.
        let uniquelist = ranklist.filter((element, index) => {
            return ranklist.indexOf(element) === index;
        });
        let length = uniquelist.length;   //2~8개
        for(i=0; i<length-4; i++){  //최소 5개는 있어야함.
            for(j=1; j<5; j++){  
                if(uniquelist[i]==uniquelist[i+j]+j){
                    count++;
                    if(count==4){
                    //스트레이트임.
                        let retlist = [];
                        for(j=0;j<5; j++){
                            retlist.push( cardlist.find(function(v){
                                if(uniquelist[i+j]==1)
                                    return v.rank==14;
                                return v.rank==uniquelist[i+j]}) );
                        }
                        return [4, retlist]
                    }
                    
                }
            }
            count = 0;
        }
        //for문에서 리턴이 안되면 스트레이트가 아님.
        return [-1,null]
    }
    function CheckKind(cardlist){
        //같은 숫자의 카드로 이뤄지는 패를 판별하는 함수
        let kindlist=[[],[],[]];
        //같은 숫자의 갯수
        let count=1;
        let i;
        let length = cardlist.length;
        let current = cardlist[0];
        let retlist = [];
        //kindlist 검사
        for(i=1; i<length; i++){
            if(current.rank == cardlist[i])
                count ++;
            else{
                current = cardlist[i];
                if(count>1)
                    kindlist[count-2].push(current);
                count = 1;
            }
        }
        if(kindlist[2].length>0){
            //four of kind
            //retlist.concat(kindlist[2][0]);
            retlist=kindlist[2][0].slice();
            retlist.push(cardlist.find(function(v){return v.rank != kindlist[2][0]}));
            return [7,retlist]
        } else if(kindlist[1].length>0){
            //three of kind or full house
            if(kindlist[1].length>1){
                //full house
                retlist=kindlist[1][0].concat(kindlist[1][1]).slice();
                retlist.pop();
                return [6,retlist];
            } else if(kindlist[0].length>0){
                //full house
                retlist=kindlist[1][0].concat(kindlist[0][0]).slice();
                return [6,retlist];
            } else {    //three of kind
                retlist=kindlist[1][0].concat(cardlist.filter(function(v){return v.rank != kindlist[1][0].rank}).slice(0,2));
                return [3,retlist]
            }
        }else if(kindlist[0].length>1){
            //two pair
            retlist=kindlist[0][0].concat(kindlist[0][1]);
            retlist.push(cardlist.find(function(v){return v.rank != kindlist[0][0].rank && v.rank != kindlist[0][1].rank}));
            return [2, retlist];
        }else if(kindlist[0].length>0){
            //one pair
            retlist=kindlist[0][0].concat(cardlist.filter(function(v){return v.rank != kindlist[0][0].rank}).slice(0,3));
            return [1, retlist];
        } else {
            retlist=cardlist.slice(0,5)
            return [0,retlist];
        }

    }
    return [score,hands];
}

function sortCardDecrement(card1,card2){
    //return값이 0보다 작을 경우 arg1이 arg2보다 낮은 색인값을 부여받음.
    //return값이 0보다 클 경우 arg2가 arg1보다 낮은 색인값을 부여받음.
    return card2.rank-card1.rank; //card2의 랭크가 더 크다면 card1보다 먼저 옮. 
}
//css를 이용한 애니메이션 담당 오브젝트
var animator={
    newCard: function(id){
        let deck=document.getElementsByClassName('deck')[2]
        let newcard=deck.cloneNode(true);
        newcard.setAttribute('id', id);
        newcard.style.left='350px';
        newcard.style.top='20px';
        gameDiv.appendChild(newcard);
        return newcard;
    },
    move: function(div, moveToX, moveToY){
        //0.25초쯤에 목적지에 도달
        //fps=50이므로 프레임이 약 12번 호출되면 도착해야함.
        let originY = Number(div.style.top.slice(0,-2));
        let originX = Number(div.style.left.slice(0,-2));
        let xPerFrame = Math.round((moveToX-originX)/12);
        let yPerFrame = Math.round((moveToY-originY)/12);
        let myPromise=new Promise((resolve, reject) => {
            let interval = setInterval(frame,20)
            let i=0;
            function frame(){
                i++;
                div.style.top = originY+i*yPerFrame + "px";
                div.style.left = originX+i*xPerFrame + "px";
                if(i==12){
                    clearInterval(interval);
                    div.style.top = moveToY + "px";
                    div.style.left = moveToX + "px";
                    resolve(true);
                }
            }
        });
        return myPromise;
    },
    flip: async function(div, cardid){
        let degree = 0;
        let cardfilename = "";
        let card = new Card(cardid);
        switch(card.suit){
            case 0:
                cardfilename='s';
                break;
            case 1:
                cardfilename='d';
                break;
            case 2:
                cardfilename='h';
                break;
            case 3:
            cardfilename='c';
            break;
        }
        if(card.rank==14){
            cardfilename+="01";
        }
        else if(card.rank<10){
            cardfilename+="0"+card.rank;
        } else {
            cardfilename+=card.rank;
        }
        cardfilename+='.png'
        
        //50fps. 0.25초쯤에 뒤집을 예정. 6번 호출에 절반, 12번 호출에 완료
        let myPromise = new Promise((resolve, reject)=>{
            let interval = setInterval(function(){
                degree+=15;
                div.style.transform = "rotateY("+degree+"deg)";
                if(degree>=90){
                    div.children[0].src = "./images/"+cardfilename;
                    degree = 90;
                    div.style.transform = "rotateY("+degree+"deg)";
                    clearInterval(interval);
                    resolve(true);
                }
            },20);
        })
        await myPromise;
        myPromise = new Promise((resolve, reject)=>{
            let interval = setInterval(function(){
                degree-=15;
                div.style.transform = "rotateY("+degree+"deg)";
                if(degree<=0){
                    degree = 0;
                    div.style.transform = "rotateY("+degree+"deg)";
                    clearInterval(interval);
                    resolve(true);
                }
            },20);
        });
        await myPromise;
        return true;
    },
    deleteCard: function(id){
        let removeElement = document.getElementById(id);
        gameDiv.removeChild(removeElement);
    }
};

function activateActionButton(){
    callBtn.hidden = false;
    raiseBtn.hidden = false;
    foldBtn.hidden = false;
    callBtn.disabled = false;
    raiseBtn.disabled = false;
    foldBtn.disabled = false;
}
function deactivateActionButton(){
    callBtn.hidden = true;
    raiseBtn.hidden = true;
    foldBtn.hidden = true;
    callBtn.disabled = true;
    raiseBtn.disabled = true;
    foldBtn.disabled = true;
}
var playerStatusEnum = {
    spectate: 0,
    imin: 1,
    notready: 2,
    ready: 3,
    playing: 4,
    action: 5,
    fold: 6,
    disconnect: 7
};

var playerActionEnum = {
    //아직 액션을 취하지 않음.
    actUndef : 0,
    actCall : 1,
    actRaise : 2,
    actFold : 3 

};