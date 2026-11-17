// 게임 내용. 2027학년도 수능에서 실제로 시행되는 감독 절차와
// 실제 적발이 많은 유형(전자기기 소지, 종료령 후 답안 작성, 4교시 응시 방법 위반)을 바탕으로 한다.
// 계획형 부정행위는 감독관 쪽에서 보이는 징후만 다룬다. 방법을 안내하지 않는다.

export const SEATS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export const PERIODS = [
  { label: '1교시', subject: '국어', start: [8, 40], end: [10, 0] },
  { label: '2교시', subject: '수학', start: [10, 30], end: [12, 10] },
  { label: '3교시', subject: '영어', start: [13, 10], end: [14, 20] },
  { label: '4교시', subject: '한국사·탐구', start: [14, 50], end: [16, 37] },
];

// 입실 점검: 08:10 ~ 08:40 (30분). 행동마다 걸리는 분.
export const PRECHECK = {
  start: [8, 10],
  minutes: 30,
  alertAt: 15, // 08:25 재난문자
  cost: { id: 1, clothes: 2, glasses: 2, pockets: 1, announce: 1 },
};

export const BUDGET = { idCheck: 3, patrol: 3, afterCheck: 1 };

export const SURNAMES = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '전', '홍'];
export const GIVEN_NAMES = [
  '민준', '서준', '도윤', '예준', '시우', '하준', '지호', '서연', '서윤', '지우', '하은', '민서',
  '지민', '수아', '윤서', '채원', '현우', '유진', '은우', '다은', '건우', '소율', '태윤', '나연',
];

// ---------- 실수형: 대부분의 실제 적발 사례 ----------
export const SLIPS = {
  phoneOn: {
    name: '휴대폰 소지 (전원 켜짐)',
    pocket: true,
    ring: true,
    find: '외투 주머니에서 전원이 켜진 휴대폰이 나왔다.',
    reaction: ['아… 엄마가 주머니에 넣어 둔 걸 몰랐어요.', '꺼서 가방에 넣은 줄 알았는데…'],
    patrol: '외투 주머니가 네모나게 불룩하다.',
    reveal: '휴대폰을 주머니에 넣은 채 깜빡했다.',
  },
  phoneOff: {
    name: '휴대폰 소지 (전원 꺼짐)',
    pocket: true,
    find: '바지 주머니에서 전원이 꺼진 휴대폰이 나왔다.',
    reaction: ['꺼져 있었어요. 진짜 안 썼어요…', '제출해야 하는 줄 몰랐어요. 꺼 놨으니까요.'],
    patrol: '바지 주머니가 네모나게 불룩하다.',
    reveal: '전원을 끈 휴대폰을 주머니에 넣어 두었다. 꺼져 있어서 재난문자에도 울리지 않았다.',
  },
  watch: {
    name: '전자식 시계 착용',
    sleeve: true,
    find: '소매를 걷자 숫자 화면이 있는 전자시계가 보인다.',
    reaction: ['이거 그냥 시계예요… 디지털이면 안 되는 거였어요?', '시간만 나오는 거예요. 진짜로요.'],
    patrol: '손목에서 숫자 화면이 언뜻 보였다.',
    reveal: '숫자 화면이 있는 전자시계를 차고 있었다. 아날로그 시계만 허용된다.',
  },
  earbuds: {
    name: '무선 이어폰 케이스 소지',
    pocket: true,
    find: '주머니에서 무선 이어폰 케이스가 나왔다.',
    reaction: ['케이스만 있는 거예요. 이어폰은 집에 있어요…', '버스에서 듣고 깜빡했어요.'],
    patrol: '주머니 쪽에서 플라스틱이 달그락거린다.',
    reveal: '무선 이어폰 케이스를 주머니에 넣고 있었다.',
  },
  bell: {
    name: '종료령 후 답안 작성',
    bell: true,
    event: '종료령이 울렸다. {n}번 수험생의 손이 아직 답안지 위에서 움직인다.',
    reaction: ['한 칸만, 진짜 한 칸만 남았었어요…', '종 친 줄 몰랐어요. 집중하느라…'],
    reveal: '종료령이 울린 뒤에도 답안지를 마킹했다.',
  },
  section4: {
    name: '4교시 응시 방법 위반',
    section4: true,
    event: '첫 번째 선택과목 시간인데 {n}번 수험생 책상에 두 번째 과목 문제지가 펼쳐져 있다.',
    reaction: ['순서가 헷갈렸어요. 일부러 그런 거 아니에요.', '보기만 했어요. 아직 안 풀었어요…'],
    reveal: '4교시 첫 번째 선택과목 시간에 두 번째 과목 문제지를 봤다.',
  },
};

// ---------- 계획형: 절차를 알고 오래 준비해 온 사람 ----------
// 2026년 11월 보도 기준 장비 경향을 반영했다. 단서는 확대 그림(pixel.js drawCloseup)에 그린다.
// 감독관 눈에 보이는 징후만 다룬다. 만드는 법이나 숨기는 법은 다루지 않는다.
//   swapAfter: 이 교시가 끝난 뒤(점심) 장비를 꺼낸다. 그 전에는 검사해도 깨끗하다.
//   detect: 쉬는 시간 정밀 점검(금속탐지기)에서 찾아낼 확률. 작은 장비일수록 낮다.
//   pose: 앞에서 눈에 띌 때의 손 동작 (glasses | ear | belly | tap | penUp)
//   blank: 장비를 쓰는 동안 문제지에 풀이 흔적이 없을 확률
//   tells: 교시 시작 때 앞에서 보이는 짧은 장면 { periods, count, lines }
export const SCHEMES = {
  aiGlasses: {
    name: '스마트안경 + 생성형 AI',
    needsGlasses: true,
    swapAfter: 1,
    detect: 1,
    pose: 'glasses',
    blank: 0.7,
    tells: { periods: [2, 3], count: [2, 2], lines: ['{n}번, 안경을 고쳐 쓴다'] },
    found: '안경다리 안쪽에서 렌즈 구멍과 배터리가 나왔다. 오전에 검사받은 안경이 아니다.',
    caught: '말없이 고개를 숙인다.',
    calm: ['네, 확인하세요.', '얼마든지요.'],
    reveal: '오전엔 검사용 평범한 안경, 점심에 똑같이 생긴 스마트안경으로 바꿔 썼다. 확대 그림: 오후에 테가 두꺼워지고 렌즈 점이 반짝였다.',
  },
  buttonCam: {
    name: '단추형 초소형 카메라',
    detect: 1,
    clothes: 'shirt',
    pose: 'none',
    blank: 0,
    tells: { periods: [0, 1, 2, 3], count: [2, 3], lines: ['{n}번, 단추 스티커가 떨어졌다'], sticker: true },
    found: '셔츠 단추 하나가 초소형 카메라였다.',
    caught: '"그냥 단추예요." 더 말하지 않는다.',
    calm: ['저 아무것도 없어요.', '확인하셔도 돼요.'],
    reveal: '단추형 카메라로 문제를 찍어 밖으로 보냈다. 확대 그림: 두 번째 단추가 스티커보다 커서 삐져나왔고, 스티커가 자꾸 없어졌다.',
  },
  penCam: {
    name: '사인펜 위장 카메라',
    detect: 1,
    pose: 'penUp',
    blank: 0.3,
    tells: { periods: [0, 1, 2, 3], count: [1, 2], lines: ['{n}번, 사인펜을 세워 들고 있다'] },
    found: '나눠 준 사인펜이 아니었다. 뚜껑 안에 카메라가 있다.',
    caught: '"…펜이 바뀐 줄 몰랐어요."',
    calm: ['나눠 주신 펜 그대로예요.', '네, 보세요.'],
    reveal: '지급 사인펜과 닮은 카메라 펜으로 바꿔치기했다. 확대 그림: 지급 펜의 흰 띠가 없고 뚜껑 끝에 검은 점이 있었다.',
  },
  earpiece: {
    earsVisible: true, // 귀를 덮는 머리 모양이면 단서가 안 보이므로 짧은 머리로 바꾼다
    name: '쌀알 크기 이어폰',
    detect: 0.5,
    pose: 'ear',
    blank: 0.7,
    tells: { periods: [0, 1, 2, 3], count: [1, 2], lines: ['{n}번, 귀를 만진다'], extra: { period: 2, text: '듣기평가 중 {n}번, 한쪽 귀를 막고 있다' } },
    found: '귀 안에서 쌀알만 한 살색 이어폰이 나왔다.',
    missText: '금속탐지기 반응 없음. 너무 작은 장비는 안 잡힌다던데…',
    caught: '귀를 감싸 쥐고 말이 없다.',
    calm: ['이명이 좀 있어서요.', '네, 확인하세요.'],
    reveal: '귀 속 초소형 이어폰으로 답을 들었다. 확대 그림: 오른쪽 귓구멍 안에 작은 덩어리가 보였고, 문제지에 풀이가 없었다.',
  },
  vibration: {
    name: '몸에 붙인 진동 수신기',
    detect: 0.8,
    pose: 'belly',
    blank: 0.7,
    tells: { periods: [0, 1, 2, 3], count: [1, 2], lines: ['{n}번, 배에 손을 얹고 있다', '{n}번, 책상을 톡톡 센다'] },
    found: '허리에 붙인 동전만 한 진동 수신기가 나왔다.',
    missText: '금속탐지기가 한 번 울렸다가 조용해졌다.',
    caught: '허리를 감싸 쥐며 시선을 피한다.',
    calm: ['배가 좀 아파서요.', '그냥 버릇이에요.'],
    reveal: '허리에 붙인 진동 수신기로 답 번호를 받았다. 확대 그림: 허리춤이 불룩했고 가끔 "~" 진동이 보였다.',
  },
  hybridWatch: {
    name: '아날로그로 위장한 스마트워치',
    detect: 1,
    watch: 'hybrid',
    pose: 'none',
    blank: 0.5,
    tells: { periods: [0, 1, 2, 3], count: [1, 2], lines: ['{n}번, 손목시계를 자주 본다'] },
    found: '바늘 시계였지만 안에 통신 기능이 있었다. 알림이 오면 바늘이 답 번호를 가리킨다.',
    caught: '"바늘 있는 시계잖아요…" 목소리가 작아진다.',
    calm: ['아날로그 시계는 되잖아요.', '바늘 시계예요.'],
    reveal: '겉은 아날로그인 하이브리드 스마트워치였다. 확대 그림: 시곗바늘이 지금 시각과 다른 시각을 가리키곤 했다.',
  },
  proxy: {
    name: '대리 응시',
    detect: 1,
    pose: 'none',
    blank: 0,
    tells: { periods: [0, 1, 2, 3], count: [0, 0], lines: [] },
    found: '시험본부에서 신원을 다시 확인하니 사진 속 사람과 다른 사람이다.',
    caught: '"…부모님께 연락해 주세요."',
    calm: ['신분증 여기 있습니다.', '사진이 좀 오래돼서요.'],
    reveal: '다른 사람이 대신 시험을 봤다. 확대 그림: 수험표 사진에는 왼쪽 눈 밑에 점이 있는데 얼굴에는 없었다.',
  },
};

// ---------- 무고한 수험생의 습관: 계획형 단서와 겹치게 만든다 ----------
export const HABITS = {
  touchGlasses: { needsGlasses: true, pose: 'glasses', line: '{n}번, 안경을 고쳐 쓴다' },
  stickerItch: { needsButtons: true, peeled: true, line: '{n}번, 단추 스티커를 긁는다' },
  stickerFalls: { needsButtons: true, falls: true, line: '{n}번, 단추 스티커가 떨어졌다' },
  mentalMath: { blank: true, line: '{n}번, 펜을 거의 안 움직인다' },
  earTouch: { pose: 'ear', line: '{n}번, 귀를 만진다' },
  earCover: { pose: 'ear', period: 2, line: '듣기평가 중 {n}번, 한쪽 귀를 막고 있다' },
  tapping: { pose: 'tap', line: '{n}번, 책상을 톡톡 두드린다' },
  stomach: { pose: 'belly', line: '{n}번, 배를 감싸 쥐고 있다' },
  penHold: { pose: 'penUp', line: '{n}번, 사인펜을 세워 들고 생각한다' },
  watchLook: { watch: 'analog', line: '{n}번, 손목시계를 자주 본다' },
};

export const PROTEST = [
  '저 아무것도 없어요. 시간 다 뺏겼잖아요.',
  '이거 민원 넣을 거예요.',
  '다음 교시 망치면 책임지실 거예요?',
  '…집중이 다 깨졌어요.',
];

export const AMBIENT = [
  { text: '복도감독관의 발소리가 지나간다.' },
  { text: '형광등 하나가 잠깐 깜빡였다.' },
  { text: '누군가 코를 훌쩍인다.' },
  { text: '부감독관이 교실 뒤쪽을 천천히 돈다.' },
  { text: '듣기평가 방송이 나오는 동안 교실이 쥐 죽은 듯 조용하다.', period: 2 },
  { text: '점심을 먹은 뒤라 교실 공기가 나른하다.', period: 2 },
  { text: '해가 기울어 교실 바닥에 그림자가 길게 진다.', period: 3 },
];

export const LOOKS = {
  skin: ['#f1c9a5', '#e8b98f', '#d9a77c', '#c48e66'],
  hair: ['#1d1917', '#2e231d', '#3d2a1f', '#4a3326'],
  hairStyle: ['short', 'buzz', 'long', 'bob', 'fluffy', 'ponytail'],
  clothes: [
    // buttons: 단추가 있는 옷만 단추 스티커를 붙인다
    { body: '#2b3a5e', trim: '#e9ecef', kind: 'uniform', buttons: true },
    { body: '#6b2f3b', trim: '#e9ecef', kind: 'uniform', buttons: true },
    { body: '#757b84', trim: '#5f646c', kind: 'hoodie', buttons: false },
    { body: '#3e5a4b', trim: '#30473b', kind: 'hoodie', buttons: false },
    { body: '#28282d', trim: '#46464f', kind: 'padding', buttons: false },
    { body: '#a59a86', trim: '#8b806d', kind: 'padding', buttons: false },
    { body: '#e2e0d8', trim: '#9aa0a6', kind: 'shirt', buttons: true },
    { body: '#9fb6d6', trim: '#6f87a8', kind: 'shirt', buttons: true },
  ],
  // 얼굴 변형: 학생마다 하나씩 골라 복제된 느낌을 없앤다
  face: {
    shape: ['oval', 'round', 'square', 'narrow'],
    eye: ['round', 'narrow', 'droopy', 'sharp'],
    brow: ['straight', 'arch', 'thick', 'thin'],
    mouth: ['normal', 'wide', 'small'],
    nose: ['small', 'long'],
  },
};
