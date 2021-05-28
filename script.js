'use strict';
var uid;
var gameDiv;
const myEventBus = new Comment('my-event-bus');
window.addEventListener("load", function(event) {
    gameDiv = document.getElementById('gameDiv');
    uid = sessionStorage.getItem('uid');
    //uid가 없으면 prompt로 입력 받음.
    if(!uid){
        sessionStorage.setItem('uid',prompt("enter your name"));
        uid = sessionStorage.getItem('uid');
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
    let me = new Player(uid, 100);
    document.getElementById('money').innerText = '100';
    let bot = new Player("bot", 100);
    gm.joinPlayer(bot,100);
    gm.joinPlayer(me,100);
}
function resetGame(){
    startBtn.disabled = false;
    startBtn.hidden = false;
    document.getElementById('money').innerText = '';
    gm = new GameManager();
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
        this.shuffle();
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
        //최대 게임 참가 인원수
        if(max_p == undefined){
            this.maxPlayer = 8;
        } else
            this.maxPlayer  = max_p;
        
        //dealer 포지션이 누구인가를 가리키는 인덱스.
        this.dealerIndex;
        //action중인 플레이어 인덱스
        this.actionIndex;
        //action에 사용할 시간제한 타이머
        this.actionTimer;
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
        this.game_phase = -1;
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
        if(this.game_phase!=-1){
            this.waitinglist.push(player);
            player.status=playerStatusEnum.imin;
        } else {
            if(this.dealerIndex==undefined){
                this.dealerIndex = Math.floor(Math.random()*this.playerList.length);
            }
            this.playerList.splice((this.dealerIndex+1)%this.maxPlayer, 0, player)
            player.status=playerStatusEnum.notready;
        }
    }
    playerReqStart(player){
        let i;
        if(this.game_phase != -1){
            return;
        }
        player.status=playerStatusEnum.ready;
        //준비된 인원을 세서 전원 준비가 되면 시작.
        let startReqCount=0;
        for(i=0; i<this.playerList.length; i++){
            if(this.playerList[i].status==playerStatusEnum.ready){
                startReqCount++;
            }
        }
        //TODO. 전원이 준비가 안되어도 최소 인원이 준비하면 몇초의 카운트다운 후 시작하게 변경해야함.
        if(startReqCount == this.playerList.length && this.playerList.length>1){
            this.nextPhase();
        }
    }

    //대기자들이 테이블에 참여
    seatTable(){
        if(this.maxPlayer-this.playerList.length > 0){
            if(dealerIndex==undefined){
                this.dealerIndex = Math.floor(Math.random()*this.playerList.length);
            }
            let newplayers=this.waitinglist.splice(0, this.maxPlayer-this.playerList.length)
            let i;
            let count = newplayers.length;
            for(i=0; i<count; i++){
                if(this.playerList.length < this.maxPlayer){
                    this.playerList.splice((this.dealerIndex+i+1)%this.maxPlayer,0, newplayers[i])
                }
                else{
                    break;
                }
            }
        }
    }
    //다음 페이즈로 넘어가기 요청. 각 페이즈마다 해당 작업을 하고 phase에 1 더함.
    nextPhase(){
        this.game_phase ++;
        switch(this.game_phase){
            //프리플랍
            case 0:
                if(this.gatherEnty(this.baseEnty)){
                    this.maxBet = this.baseEnty;
                    this.dealingCards();
                    this.animate_dealing();
                    console.log('end animate')
                }
                break;
            //action phase
            case 1:
                this.startActions();
                break;
            //플랍
            case 2:
                console.log('flop phase');
                this.flopCards();
                this.animate_flop();
                break;
            case 3:
                this.startActions();
                break;
            //턴
            case 4:
                console.log('turn phase');
                this.turnCard();
                this.animate_turn();
                break;
            case 5:
                this.startActions();
                break;
            //리버
            case 6:
                console.log('river phase');
                this.riverCard();
                this.animate_river();
                break;
            case 7:
                this.startActions();
                break;
            //결산
            case 8:
                this.endRound();
                break;
        }
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
            } else {    
                //온라인 플레이시 참가비가 모자란 플레이어가 있으면 빼고 시작.
                //this.playerList.splice(i,1);
                //싱글 플레이시 승/패 메시지를 띄우고 게임 초기화
                if(this.playerList[i].id == uid){
                    alert('돈을 다 잃으셨습니다.');
                }
                else{
                    alert(this.playerList[i].id+'님이 돈을 다 잃으셨습니다.')
                }
                resetGame();
                return false;
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
            updatePot();
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
    flopCards(){
        this.board[0]=this.cardDeck.Draw();
        this.board[1]=this.cardDeck.Draw();
        this.board[2]=this.cardDeck.Draw();
    }
    turnCard(){
        this.board[3]=this.cardDeck.Draw();
    }
    riverCard(){
        this.board[4]=this.cardDeck.Draw();
    }
    endRound(){
        animator.clearActionDivs();
        if(this.getPlayingPlayers().length>0)
            this.decideWinner();
        //플레이중인 플레이어가 0명인 경우는 없어야 함.(모두가 폴드하기 전에 마지막 사람이 승자가 되므로 일어나선 안되는 일).
        else{
            alert('ERROR: No one is playing player');
        }
        this.game_phase = -1;
        this.pot = 0;
        updatePot();
        this.maxBet = 0;
        this.board.fill(undefined);
        this.cardDeck.Reset();
        this.dealerIndex = (this.dealerIndex++)%this.playerList.length;
        animator.reset(5000);
    }
    decideWinner(){
        let i;
        let alivePlayer = this.getPlayingPlayers();
        //나머지 사람이 폴드하여 한명만 남아 게임이 끝날 경우
        if(alivePlayer.length == 1){
            alert('The Winner is '+alivePlayer[0].id);
            alivePlayer[0].money += this.pot;
            updateMoney();
            return;
        }

        //showdown. 마지막까지 플레이중인 플레이어가 2이상이면 패를 공개
        alivePlayer.forEach(function(v){
            if(v.id != uid){
                animator.flip(document.getElementById(v.id+',0'),v.inHands[0],250);
                animator.flip(document.getElementById(v.id+',1'),v.inHands[1],250);
            }    
        })
        
        //각 플레이어의 패의 점수를 저장. alert으로 각 플레이어의 점수를 표시하기 용이함.
        let scorelist=[];
        for(i=0; i<alivePlayer.length; i++){
            scorelist.push(alivePlayer[i].showMyHands());
        }
        //일단 비교한 사람들 중에선 가장 강한 패를 가진 플레이어를 저장하는 임시 변수.
        //비기는 경우도 있기 때문에 리스트로 저장.
        let tempWinners = [alivePlayer[0]];
        let tempWinnersHands = scorelist[0];
        //패 비교 결과
        let compRes;
        //i가 0부터 시작하면 처음에 자기 자신과 비교하게됨. 1부터 시작.
        for(i=1; i<alivePlayer.length; i++){
            compRes = compareHands(tempWinnersHands, scorelist[i]);
            if(compRes == 1){
                continue;
            } else if(compRes == 2){
                tempWinners = [alivePlayer[i]];
                tempWinnersHands = scorelist[i];
            }
            else {
                tempWinners.push(alivePlayer[i]);
            }
        }

        let Winners = tempWinners;
        //이긴 사람들끼리 배팅금 나눠먹기. 소숫점 이하는 버림.
        let prize = Math.floor(this.pot/Winners.length);
        Winners.forEach(function(v){
            console.log(v);
            v.money += prize;
        });
        let WinnersId=[];
        Winners.forEach(function(v){
            WinnersId.push(v.id);
        })
        let scoreString=''
        for(i=0; i<alivePlayer.length; i++){
            scoreString+=alivePlayer[i].id+': '
                +this.ScoreToString(scorelist[i][0])+'\n';
        }
        alert('The Winner is '+WinnersId.join(', ')+'\n'+scoreString);
        updateMoney();
        //리턴값 0 or 1 or 2 첫번째 패가 높으면 1, 두번째가 높으면 2, 같으면 0
        function compareHands(hand1, hand2){
            if (hand1[0] > hand2[0]){
                return 1;
            } else if(hand1[0] < hand2[0]){
                return 2;
            }
            //여기까지 왔으면 키커로 승패를 가려야함.
            let i;
            for(i=0; i<5; i++){
                if(hand1[1][i].rank > hand2[1][i].rank)
                    return 1;
                else if(hand1[1][i].rank < hand2[1][i].rank)
                    return 2;
                else 
                    continue;
            }
            //5번의 비교로 승패가 가려지지 않았다면
            return 0;
        }
        
        return;
    }
    //플레이어들의 액션을 받음.
    startActions(){
        console.log('action '+this.game_phase);
        this.actionIndex = this.dealerIndex;
        //nextAction에서 actionIndex ++ 하기 때문에 딜러 다음 플레이어부터 액션을 시작하려면 딜러 인덱스를 액션 인덱스로 지정해야함.
        this.nextAction();
    }
    nextAction(){
        //액션 단계가 끝나는 조건1. 나머지가 모두 폴드하고 한명만 플레이 중인 경우. end round.
        let i;
        let playCount=0;
        this.playerList.forEach(function(v){
            if(v.status == playerStatusEnum.playing){
                playCount++;
            }
        })
        if(playCount == 1){
            //초기화
            this.playerList.forEach(function(v){
                v.action = playerActionEnum.actUndefined;
                animator.clearActionDivs();
            })
            this.endRound();
            return;
        }

        this.actionIndex = (this.actionIndex+1)%this.playerList.length;
        let playerIndex = this.actionIndex;
        let player = this.playerList[playerIndex];
        
        //액션을 스킵하는 경우
        //1. 현재 플레이어가 이미 폴드한 경우
        if(player.action == playerActionEnum.actFold){
            this.nextAction();
            return;
        }
        
        //액션이 끝나는 조건2. 현재 인덱스의 플레이어가 이미 액션을 취한 상태에서 가장 높은 액수의 베팅을 한 경우 next phase
        if(player.action != playerActionEnum.actUndefined && player.reserved == this.maxBet){
            //초기화
            this.playerList.forEach(function(v){
                v.action = playerActionEnum.actUndefined;
                animator.clearActionDivs();
            })
            console.log('action end, playerlist: '+this.playerList);
            if(this.game_phase != -1)
                this.nextPhase();
            return;
        }

        if(player.id.slice(0,3) == 'bot'){
            myEventBus.dispatchEvent(customEventDict.actionCall());
            return;
        }
        else{
            //액션 버튼을 활성화하고 30초 안에 버튼클릭 액션을 안하면 폴드 처리함.
            activateActionButton();
            //디버깅중... 제한시간 임시적으로 해제
            /*this.actionTimer = setTimeout(function(){
                myEventBus.dispatchEvent(customEventDict.actionTimeout());
            },30000);*/
        }
    }
    //자신의 위치는 항상 6시이며 이를 기준으로 다른사람의 자리가 정해짐.
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
            //뒷 요소를 앞으로 보내야 가운데로 만들 수 있음.
            tempPlayerList.unshift(tempPlayerList.pop());
            pIndex++;
        }
        let left = tempPlayerList.slice(pIndex+1, pLength);
        //낮은 인덱스 = 테이블의 위쪽. 높은 인덱스 = 테이블의 아래쪽으로 통일하기 위해 반전.
        left.reverse();
        let right = tempPlayerList.slice(0, pIndex);
        return [right,left];
    }
    //카드 돌리기 애니메이션
    animate_dealing(){
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
                animator.animationQueue.push(new animation (animator.newCard(right[i].id+','+j),'move', 250,x, y));
            }
            //플레이어 본인
            x=gameWidth/2-115+115*j;
            y=gameHeight-160;
            animator.animationQueue.push(new animation (animator.newCard(uid+','+j),'move', 250,x, y));

            //왼쪽 사람들
            x=20+50*j;
            for(i=0; i<left.length; i++){
                y = (i+1)*(gameHeight/right.length+1);
                animator.animationQueue.push(new animation (animator.newCard(left[i].id+','+j), 250, x, y));
            }
        }
        //플레이어 본인의 카드 뒤집기
        animator.animationQueue.push(new animation(document.getElementById(uid+',0'), 'flip', 250, this.getPlayer(uid).inHands[0]));
        animator.animationQueue.push(new animation(document.getElementById(uid+',1'), 'flip', 250, this.getPlayer(uid).inHands[1]));
        
        animator.animateNext();
        
        return true;
    }
    animate_flop(){
        let gameDivCss=getComputedStyle(gameDiv)
        let gameHeight = Number(gameDivCss.height.slice(0,-2));  
        let gameWidth = Number(gameDivCss.width.slice(0,-2));
        let cardx = 50;
        let cardy = 140;
        let y = gameHeight/2;
        let x = gameWidth/2;
        let positions = [[x-cardx*2.5,y-cardy/2],[x-cardx*1.5,y-cardy/2],[x-cardx*0.5,y-cardy/2]];
        let i;
        //커뮤니티 카드 세장 깔기
        for(i=0; i<3; i++){
            animator.animationQueue.push(new animation(animator.newCard('board'+i),'move', 250, positions[i][0], positions[i][1]));
            animator.animationQueue.push(new animation(document.getElementById('board'+i),'flip',250, this.board[i]));
        }
        animator.animateNext();
    }
    animate_turn(){
        let gameDivCss=getComputedStyle(gameDiv)
        let gameHeight = Number(gameDivCss.height.slice(0,-2));  
        let gameWidth = Number(gameDivCss.width.slice(0,-2));
        let cardx = 50;
        let cardy = 140;
        let y = gameHeight/2;
        let x = gameWidth/2;
        let position = [x+cardx*0.5, y-cardy/2];
        
        //커뮤니티 카드 한장 깔기
        animator.animationQueue.push(new animation(animator.newCard('board3'),'move', 250, position[0], position[1]));        
        //카드 뒤집기
        animator.animationQueue.push(new animation(document.getElementById('board3'),'flip',250, this.board[3]));

        animator.animateNext();
    }
    animate_river(){
        let gameDivCss=getComputedStyle(gameDiv)
        let gameHeight = Number(gameDivCss.height.slice(0,-2));  
        let gameWidth = Number(gameDivCss.width.slice(0,-2));
        let cardx = 50;
        let cardy = 140;
        let y = gameHeight/2;
        let x = gameWidth/2;
        let position = [x+cardx*1.5,y-cardy/2];
        
        //커뮤니티 카드 한장 깔기
        animator.animationQueue.push(new animation(animator.newCard('board4'),'move', 250, position[0], position[1]));
        //카드 뒤집기
        animator.animationQueue.push(new animation(document.getElementById('board4'),'flip',250, this.board[4]));

        animator.animateNext();
    }
    animateAction(id,action){
        //본인 플레이어는 필요없음.
        if(id == uid){
            return;
        }
        let positions = this.setPosition();
        let right = positions[0];
        let left = positions[1];
        
        let gameDivCss=getComputedStyle(gameDiv);
        let gameHeight = Number(gameDivCss.height.slice(0,-2));  
        let gameWidth = Number(gameDivCss.width.slice(0,-2));
        
        let x, y;

        let index;
        index=right.findIndex(function(v){
            return v.id==id;
        })
        if(index != undefined){
            x = gameWidth-200;
            y = gameHeight/(right.length+1)*(index+1);
        } else{
            x = 200;
            y = gameHeight/(left.length+1)*(index+1);
        }
        animator.popAction(action,x,y);
    }
    getPlayer(id){
        let index=this.playerList.findIndex(function(player){
            return player.id == id;
        })
        return this.playerList[index];
    }
    getPlayingPlayers(){
        let alive = [];
        let i;
        for(i=0; i<this.playerList.length; i++){
            if(this.playerList[i].status == playerStatusEnum.playing)
                alive.push(this.playerList[i]);
        }
        return alive;
    }
    ScoreToString(score){
        switch(score){
            case 0:
                return 'highcard';
            case 1:
                return 'one pair';
            case 2:
                return 'two pair';
            case 3:
                return 'three of kind';
            case 4:
                return 'straight';
            case 5:
                return 'flush';
            case 6:
                return 'full house';
            case 7:
                return 'four of kind';
            case 8:
                return 'straight flush';
        }
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
    getBoard(){
        //주소가 아닌 값을 복사
        this.board = gm.board.slice();
    }
    //판돈을 가장 많이 건 사람의 액수를 받아옴
    getMaxBet(){
        //전역변수 gm(game manager) 참조
        return gm.maxBet;
    }
    //2장의 카드와 5장의 커뮤니티 카드를 조합하여 가장 높은 랭크의 조합을 리턴
    showMyHands(){
        this.getBoard();
        let cardlist = [];
        this.inHands.concat(this.board).forEach(function(v){
            cardlist.push(new Card(v));
        })
        return handsEvaluator(cardlist);
    }
    actCall(){
        let amount = this.getMaxBet() - this.reserved;
        this.money -= amount;
        this.reserved += amount;
        gm.pot += amount;
        updatePot();
        this.action = playerActionEnum.actCall;
        
    }
    actFold(){
        this.action = playerActionEnum.actFold;
        this.status = playerStatusEnum.fold;
        this.reserved = 0;
        
    }
    actRaise(amount){
        let change = gm.maxBet-this.reserved+amount;
        this.money -=change;
        updateMoney();
        this.reserved += change;
        gm.pot += change;
        updatePot();
        gm.maxBet = this.reserved;
        this.action = playerActionEnum.actRaise;
    }
}

//7장의 카드를 받아 5장으로 가장 높은 패를 만들어 종류와 패를 구성한 5장의 카드를 리턴하는 함수. [int, array(5)]
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
                if(result[1]){
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
            if(current.rank == cardlist[i].rank)
                count ++;
            else{
                if(count>1)
                    kindlist[count-2].push(current.rank);
                count = 1;
                current = cardlist[i];
            }
        }
        if(count>1){
            kindlist[count-2].push(current.rank);
            count = 1;
            current = cardlist[i];
        }
        if(kindlist[2].length>0){
            //four of kind
            //retlist.concat(kindlist[2][0]);
            count = 0;
            cardlist.forEach(function(v){
                //5장의 패는 4장의 카인드와 높은 패 한장으로 구성됨. 
                if(v.rank==kindlist[2][0]){
                    retlist.push(v);
                }
                else if(count<1){
                    retlist.push(v);
                }
            });
            return [7,retlist]
        } else if(kindlist[1].length>0){
            //three of kind or full house
            if(kindlist[1].length>1){
                //full house 3장의 카인드가 2개있는경우
                cardlist.forEach(function(v){
                    //5장의 패는 3장의 카인드 두개로 구성됨. 
                    if(v.rank==kindlist[1][0] || v.rank==kindlist[1][1]){
                        retlist.push(v);
                    }
                });
                return [6,retlist];
            } else if(kindlist[0].length>0){
                //full house 3장의 카인드와 2장의 페어가 있는 경우
                cardlist.forEach(function(v){
                    //5장의 패는 3장의 카인드와 2장의 페어로 구성됨.
                    if(v.rank==kindlist[1][0] || v.rank==kindlist[0][0]){
                        retlist.push(v);
                    }
                });
                return [6,retlist];
            } else {    //three of kind
                count = 0;
                cardlist.forEach(function(v){
                    //5장의 패는 3장의 카인드와 2장의 높은 패로 구성됨.
                    if(v.rank==kindlist[1][0]){
                        retlist.push(v);
                    }
                    //이미 내림차순으로 정렬되어 있음.
                    else if(count<2){
                        retlist.push(v);
                        count ++
                    }
                });
                return [3,retlist]
            }
        }else if(kindlist[0].length>1){
            //two pair
            count = 0;
            cardlist.forEach(function(v){
                //5장의 패는 4장의 페어와 1장의 높은 패로 구성됨.
                if(v.rank==kindlist[0][0] || v.rank==kindlist[0][1]){
                    retlist.push(v);
                }
                //이미 내림차순으로 정렬되어 있음.
                else if(count<1){
                    retlist.push(v);
                    count ++
                }
            });
            return [2, retlist];
        }else if(kindlist[0].length>0){
            //one pair 
            count = 0;
            cardlist.forEach(function(v){
                //5장의 패는 2장의 페어와 3장의 높은 패로 구성됨.
                if(v.rank==kindlist[0][0]){
                    retlist.push(v);
                }
                //이미 내림차순으로 정렬되어 있음.
                else if(count<3){
                    retlist.push(v);
                    count ++
                }
            });
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
const animator={
    createdCards:[],
    createdActionDivs:[],
    animationQueue: [],
    newCard: function(id){
        let deck=document.getElementsByClassName('deck')[2]
        let newcard=deck.cloneNode(true);
        newcard.setAttribute('id', id);
        newcard.style.left='350px';
        newcard.style.top='20px';
        gameDiv.appendChild(newcard);
        this.createdCards.push(newcard);
        return newcard;
    },
    newActionDiv: function(action){
        
    },
    animateNext: function(){
        let animation=this.animationQueue.shift();
        if(!animation){
            myEventBus.dispatchEvent(customEventDict.animationDealEnd());
            return;
        }
        switch(animation.type){
            case 'move':
                this.move(animation.div, animation.args[0], animation.args[1], animation.duration);
                
                break;
            case 'flip':
                this.flip(animation.div, animation.args[0], animation.duration);
                break;
        }
        setTimeout(function(){
            animator.animateNext();
        },animation.duration)
        
    },
    move: function(div, moveToX, moveToY, duration){
        
        //duration 후에 목적지에 도달
        let originY = Number(div.style.top.slice(0,-2));
        let originX = Number(div.style.left.slice(0,-2));
        let maxFrame = Math.round(duration/20);
        //50fps로 설정       
        let interval = setInterval(frame,20)
        let i=0;
        function frame(){
            i++;
            div.style.top = originY + Math.round((moveToY-originY)/maxFrame)*i + "px";
            div.style.left = originX + Math.round((moveToX-originX)/maxFrame)*i + "px";
            if(i==maxFrame){
                clearInterval(interval);
                div.style.top = moveToY + "px";
                div.style.left = moveToX + "px";
            }
        }
    },
    flip: function(div, cardid, duration){
        
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
        
        //50fps. 각 프레임당 뒤집어야 할 각도 = 180 / (duration / interval) = 90 * interval / duration
        let deltaDegree = 180 * 20 / duration;
        let reverse = false;
        let interval = setInterval(function(){
            if(reverse)
                degree -= deltaDegree;
            else 
                degree += deltaDegree;
            
            div.style.transform = "rotateY("+degree+"deg)";
            if(degree >= 90){
                div.children[0].src = "./images/"+cardfilename;
                degree = 90;
                div.style.transform = "rotateY(90deg)";
                //회전방향 반대로. 180까지 돌려버리면 이미지가 반전되서 보임.
                reverse = true;
            }
            if(degree <= 0){
                clearInterval(interval);
                div.style.transform = "rotateY(0deg)";
            }
        },20);
    },
    popAction: function(action, x, y,){
        //create new div.
        let div = document.createElement('div');
        let content=document.createTextNode(action);
        div.appendChild(content);
        gameDiv.appendChild(div);
        this.createdActionDivs.push(div);

        //set div's position
        div.style.position = 'absolute';
        div.style.top = y+'px';
        div.style.left = x+'px';
        div.style.fontSize = '30px';
        div.style.textShadow = '-1px 0 white, 0 1px white, 1px 0 white, 0 -1px white';
    },
    clearActionDivs: function(){
        console.log('clearAction')
        setTimeout(function(){
            animator.createdActionDivs.forEach(function(v,i){
                animator.deleteCard(v);
                animator.createdActionDivs.splice(i,1);
            });
        },1000);
    },
    deleteCard: function(div){
        console.log('remove div: '+div.getAttribute('id'));
        gameDiv.removeChild(div);
    },
    reset: function(timer){
        if(timer==undefined || typeof timer != 'number'){
            timer = 0;
        }
        let cards = this.createdCards.slice();
        this.createdCards = [];
        setTimeout(function(){
            cards.forEach(function(v){
                animator.move(v,350,20,250);
            });
            setTimeout(function(){
                cards.forEach(function(v){
                    animator.deleteCard(v);
                });
            },250);
            setTimeout(function(){
                myEventBus.dispatchEvent(customEventDict.animationResetEnd());
            },250);
        },timer);
    }
};
//animator에서 사용할 animation class.
//애니메이션 종류, 애니메이션에 필요한 인자, 애니메이션 지속 시간등을 저장하는 객체
class animation{
    constructor(div, type, duration){
        this.div = div;
        this.type = type;
        this.duration = duration;
        this.args = Array.prototype.slice.call(arguments);
        this.args.splice(0,3) // 앞 세자리는 div, 타입, duration으로 정해졌으므로 제거.
    }
}
function activateActionButton(){
    callBtn.hidden = false;
    raiseBtn.hidden = false;
    foldBtn.hidden = false;
    callBtn.disabled = false;
    raiseBtn.disabled = false;
    foldBtn.disabled = false;

    callBtn.addEventListener('click', clickCall);
    raiseBtn.addEventListener('click',clickRaise);
    foldBtn.addEventListener('click', clickFold);
}
function deactivateActionButton(){
    callBtn.hidden = true;
    raiseBtn.hidden = true;
    foldBtn.hidden = true;
    callBtn.disabled = true;
    raiseBtn.disabled = true;
    foldBtn.disabled = true;

    callBtn.removeEventListener('click', clickCall);
    raiseBtn.removeEventListener('click', clickRaise);
    foldBtn.removeEventListener('click', clickFold);
}
function clickCall(){
    deactivateActionButton();
    myEventBus.dispatchEvent(customEventDict.actionCall());
}
function clickRaise(){
    deactivateActionButton();
    myEventBus.dispatchEvent(customEventDict.actionRaise(10));
}
function clickFold(){
    deactivateActionButton();
    myEventBus.dispatchEvent(customEventDict.actionFold());
}

function updateMoney(){
    let div = document.getElementById('money');
    let me = gm.playerList.find(function(v){
        return v.id == uid;
    });
    div.innerText=me.money;
}
function updatePot(){
    let div = document.getElementById('pot');
    div.innerText = gm.pot;
}
const playerStatusEnum = {
    spectate: 0,
    imin: 1,
    notready: 2,
    ready: 3,
    playing: 4,
    fold: 5,
    disconnect: 6
};

const playerActionEnum = {
    //아직 액션을 취하지 않음.
    actUndefined : 0,
    actCall : 1,
    actRaise : 2,
    actFold : 3 

};

const customEventDict = {
    animationDealEnd : function(){
        return new CustomEvent('animationEnd',{
            detail: 'deal'
        });
    },
    animationResetEnd: function(){
        return new CustomEvent('animationEnd',{
            detail: 'reset'
        });
    },
    actionCall : function(){
        return new CustomEvent('actionEnd',{
            detail: 'call'
        });
    },
    actionFold : function(){
        return new CustomEvent('actionEnd',{
            detail: 'fold'
        });
    },
    actionRaise : function(amount){
        return new CustomEvent('actionEnd',{
            detail: 'raise',
            amount: amount
        });
    },
    actionTimeout : function(){
        return new CustomEvent('actionEnd',{
            detail: 'timeout'
        });
    }
}
myEventBus.addEventListener('animationEnd',function({detail}){
    //if(gm.game_phase != -1){
        gm.nextPhase();
        console.log(detail);
    //}
});
myEventBus.addEventListener('actionEnd',function({detail}){
    console.log(detail); // 'raise' or 'call' or 'fold' or 'timeout'...
    let action = detail;
    switch(detail){
        case 'timeout':
            gm.playerList[gm.actionIndex].actFold();
            action = 'fold';
            break;
        case 'fold':
            gm.playerList[gm.actionIndex].actFold();
            break;
        case 'call':
            gm.playerList[gm.actionIndex].actCall();
            break;
        case 'raise':
            //TODO. 추후에 변경.
            gm.playerList[gm.actionIndex].actRaise(10);
            break;
    }
    clearTimeout(gm.actionTimer);
    gm.animateAction(gm.playerList[gm.actionIndex].id,action);
    gm.nextAction();
});