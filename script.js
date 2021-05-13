'use strict';
class CardDeck {
    //카드덱은 스페이드 다이아 하트 클로버 13장씩 52장.
    //홀덤에서 무늬간 서열은 인정하지 않으나 그래도 아이디는 정해야하므로 스페이드부터 0~12, 다이아는 13~25, ...로 번호 할당.
    constructor(){
        this.cards = new Array(52);
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
    let game_div=document.getElementById("game_div");
    game_div.appendChild(table);
}
//대체로 랜덤함을 확인
//DeckTest(10000);

//판별함수 테스트용
function evalTest(cardlist){
    let retval = CheckStraight(cardlist);
    console.log(retval);
    
    retval = CheckFlush(cardlist);
    console.log(retval);

}
var testCardlist = [new Card(13), new Card(1), new Card(2), new Card(4), new Card(12), new Card(8), new Card(3)];
evalTest(testCardlist);
//덱 관리, 카드 돌리기, 플레이어 요청 검증 등 전반사항을 처리
class GameManager{
    constructor(){
        this.cardDeck = new CardDeck();
        //커뮤니티 카드판(공용 카드)
        this.board=new Array(5);
        //쌓인 판돈
        this.pot = 0;
        //참가한 플레이어 리스트
        this.playerList=[];
        //카드 뽑은 리스트를 저장하여 플레이어가 사기치는지 검증.
        this.drawList=[];
    }
}
//포커 참가자
class Player{
    constructor(name,money){
        this.name = name;
        this.money = money;
        this.inHands = [];
        //커뮤니티 카드 정보를 받아오는 변수
        this.board = [];
    }
    //card id를 받음
    GetCards(c1, c2){
        this.inHands[0]=c1;
        this.inHands[1]=c2;
    }
    //card id를 받음
    GetBoard(cardList){
        this.board = cardList.slice();
    }
    //2장의 카드와 5장의 커뮤니티 카드를 조합하여 가장 높은 랭크의 조합을 리턴
    
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
        return [0,null]
    }
    function CheckStraight(cardlist){
        //내림차순으로 정렬된 카드 리스트를 받음.
        let i;
        let j;
        let ranklist = [];
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
        //for문에서 리턴이 안되면 스트레이트가 아님.
        return [0,null]
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
            retlist.concat(kindlist[2][0]);
            retlist.push(cardlist.find(function(v){return v.rank != kindlist[2][0]}));
            return [7,retlist]
        } else if(kindlist[1].length>0){
            //three of kind or full house
            if(kindlist[1].length>1){
                //full house
                retlist.concat(kindlist[1][0],kindlist[1][1]);
                retlist.pop();
                return [6,retlist];
            } else if(kindlist[0].length>0){
                //full house
                retlist.concat(kindlist[1][0],kindlist[0][0]);
                return [6,retlist];
            } else {    //three of kind
                retlist.concat(kindlist[1][0], cardlist.filter(function(v){return v.rank != kindlist[1][0].rank}).slice(0,2));
                return [3,retlist]

            }
        }else if(kindlist[0].length>1){
            //two pair
            retlist.concat(kindlist[0][0], kindlist[0][1]);
            retlist.push(cardlist.find(function(v){return v.rank != kindlist[0][0].rank && v.rank != kindlist[0][1].rank}));
            return [2, retlist];
        }else if(kindlist[0].length>0){
            //one pair
            retlist.concat(kindlist[0][0], cardlist.filter(function(v){return v.rank != kindlist[0][0].rank}).slice(0,3));
            return [1, retlist];
        } else {
            retlist.concat(cardlist.slice(0,5))
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