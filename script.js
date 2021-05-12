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
        this.id = id
        this.rank = id%13
        this.suit = Math.floor(id/13)
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

//작업중...
function EvalHandRanking(cardlist){
    
    //계산의 편의를 위해 id를 카드 객체로 바꿈.
    let i;
    let j;
    for(i=0; i<7; i++){
        cardlist[i]=new Card(cardlist[i]);
    }
    //족보 순서: sf 8점, fk 7점, fh 6점, f 5점, s 4점, tk 3점, tp 2점, op 1점, h 0점. rf는 sf의 일종이며 가장 높은 패.
    //플러시와 스트레이트를 먼저 구분한 뒤 중복카드(원페어 투페어 쓰리카드 포카드)를 검사
    let score = 0;
    
}
//카드의 숫자만 따져서 스트레이트인지 아닌지 판별
function CheckStraight(cardlist){
    let i;
    let j;
    let sortedRankList = [];
    let len_c = cardlist.length;
    for(i=0; i<len_c; i++){
        if(sortedRankList.includes(cardlist[i].rank)){
            //중복된 숫자는 배제해야 스트레이트 판별이 쉬움.
            continue;
        }
        sortedRankList.push(cardlist[i].rank);
        //스트레이트에서 a는 1일수도 14가 될수도 있음.
        if(cardlist[i].rank==0){
            sortedRankList.push(13);
        }
    }
    let len_r = sortedRankList.length;
    if(len_r<5){
        //중복되지 않는 수가 5개가 안됨. 스트레이트 아님.
        return [false, null];
    }
    //내림차순으로 정렬
    sortedRankList.sort(SortDecrement);
    //debug
    console.log(sortedRankList)
    //카드 갯수-4번 검사하면 됨. 
    for(i=0; i<len_r-4; i++){
        let start = sortedRankList[i];
        //j = 1 to 4
        for(j=1; j<5; j++){
            //start로 부터 j만큼 떨어진 요소는 j만큼 작아야함.
            if(sortedRankList[i+j]==start-j){
                if(j<4){
                    continue;
                }
                else if(j==4){
                    //4번의 시험을 통과함. 스트레이트 맞음. A가 고려된 내림차순 정렬이므로 처음 발견된 스트레이트가 가장높은 스트레이트.
                    //true 와 가장 높은 스트레이트 조합을 객체로 만들어 리턴.
                    return [true, sortedRankList.slice(i,i+5)];
                }
            }
            //만약 그렇지 못하면 스트레이트가 아님.
            else{
                break;
            }
        }
    }
    //모든 검사 결과 스트레이트 조합이 발견되지 않았다면 false와 null을 조합하여 리스트로 만들어 리턴.
    return [false, null];
}
function CheckFlush(cardlist){
    let suitlist=[ [],[],[],[], ];
    let i;
    for(i=0; i<7; i++){
        let suit = cardlist[i].suit;
        suitlist[suit].push(cardlist[i]);
    }
    for(i=0; i<4; i++){
        let len_s = suitlist[i].length;
        if(len_s>=5){
            //flush는 확정. straight flush인지 검사.
            let straight = CheckStraight(suitlist[i])
            if(straight[0]){
                return [true, straight[1]];
            }
            //스트레이트가 아닐경우 가장 높은 조합을 뽑아 리턴
            else{
                let ranklist =[];
                //랭크 리스트에 현재 무늬리스트의 카드정보에서 랭크정보만 넣음.
                suitlist[i].forEach(function(a){ranklist.push(a.rank)});
                ranklist.sort(SortDecrement);
                //같은 무늬중 내림차순으로 5개가 가장 높은 패
                return [true,ranklist.slice(0,5)]
            }
        }
    }
    //flush 아님.
    return [false, null];
}
function CheckPair(cardlist){
    let ranklist = new Array(13);
    ranklist.fill(0)
    let len_c = cardlist.length;
    let i;
    for(i=0; i<len_c; i++){
        ranklist[cardlist[i].rank]++;
    }
    if(ranklist.includes(4)){
        //Four of a Kind. 7장의 카드로는 한개밖에 불가능.
        let index = ranklist.indexOf(4)
        //0 이상의 값을 가진 요소 중 포카드가 아니면서 가장 인덱스가 높은것. 0번 인덱스는 a이므로 예외적으로 가장 높음.
        let max;
        if(index !=0 && ranklist[0]>0){
            return [4,[index,index,index,index,13]]
        }
        for(i=1; i< 13; i++){
            if(ranklist[i]>0){
                max=i;
            }
        }
        return [4,[index,index,index,index,max]]
    }
    else if(ranklist.includes(3)){
        //three of a kind 또는 풀하우스
        if(ranklist.includes(2) || ranklist.includes(3)){
            //3카드가 둘이라면 
            //3+2 = 5. 그러나 4카드가 더 높음.
            return [5, []]
        }
    }

}

function SortIncrement(a,b){
    //sort에서 return값이 0보다 작을 경우 a가 b보다 낮은 색인값을 부여받음.
    return a-b;
}
function SortDecrement(a,b){
    //sort에서 return값이 0보다 클 경우 a가 b보다 높은 색인값을 부여받음.
    return b-a;
}