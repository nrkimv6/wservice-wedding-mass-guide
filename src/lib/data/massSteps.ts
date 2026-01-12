export interface Prayer {
	speaker: 'priest' | 'assembly';
	text: string;
	instruction?: string;
}

export interface HymnPlaceholder {
	type: 'entrance' | 'responsorial' | 'offertory' | 'communion' | 'recessional';
	label: string;
}

export interface MassStep {
	id: number;
	section: string;
	sectionEn: string;
	title: string;
	role: 'priest' | 'assembly' | 'reader' | 'couple' | 'narrator' | null;
	posture: 'standing' | 'seated' | 'kneeling' | null;
	description: string;
	prayers: Prayer[] | null;
	hymn: HymnPlaceholder | null;
}

export const sections = [
	{ name: '시작예식', nameEn: 'Opening Rites', range: [1, 8] },
	{ name: '말씀전례', nameEn: 'Liturgy of the Word', range: [9, 13] },
	{ name: '혼인예식', nameEn: 'Wedding Rite', range: [14, 19] },
	{ name: '성찬전례', nameEn: 'Liturgy of the Eucharist', range: [20, 25] },
	{ name: '영성체 예식', nameEn: 'Communion Rite', range: [26, 30] },
	{ name: '마침예식', nameEn: 'Concluding Rites', range: [31, 32] }
];

export const massSteps: MassStep[] = [
	{
		id: 1,
		section: '시작예식',
		sectionEn: 'Opening Rites',
		title: '혼배안내',
		role: 'narrator',
		posture: null,
		description:
			'미사 시작 전 참례자들에게 혼배미사의 의미와 진행 순서를 안내합니다. 휴대전화는 진동으로 설정해 주시고, 미사 중에는 조용히 해 주시기 바랍니다.',
		prayers: null,
		hymn: null
	},
	{
		id: 2,
		section: '시작예식',
		sectionEn: 'Opening Rites',
		title: '입당',
		role: null,
		posture: 'standing',
		description: '사제와 신랑신부가 입당합니다. 모든 참례자는 일어서서 입당 행렬을 맞이합니다.',
		prayers: null,
		hymn: { type: 'entrance', label: '입당성가' }
	},
	{
		id: 3,
		section: '시작예식',
		sectionEn: 'Opening Rites',
		title: '십자성호와 인사',
		role: 'priest',
		posture: 'standing',
		description: '사제가 십자성호를 긋고 인사를 나눕니다.',
		prayers: [
			{ speaker: 'priest', text: '† 성부와 성자와 성령의 이름으로.' },
			{ speaker: 'assembly', text: '○ 아멘.' }
		],
		hymn: null
	},
	{
		id: 4,
		section: '시작예식',
		sectionEn: 'Opening Rites',
		title: '인사',
		role: 'priest',
		posture: 'standing',
		description: '사제가 회중에게 인사합니다.',
		prayers: [
			{ speaker: 'priest', text: '† 주님께서 여러분과 함께.' },
			{ speaker: 'assembly', text: '○ 또한 사제와 함께.' }
		],
		hymn: null
	},
	{
		id: 5,
		section: '시작예식',
		sectionEn: 'Opening Rites',
		title: '참회 예식',
		role: 'assembly',
		posture: 'standing',
		description: '우리의 죄를 고백하며 하느님의 자비를 청합니다.',
		prayers: [
			{
				speaker: 'priest',
				text: '† 형제 여러분, 우리 죄를 반성하고 이 거룩한 미사를 합당하게 봉헌합시다.'
			},
			{
				speaker: 'assembly',
				text: '○ 전능하신 하느님과\n형제들에게 고백하오니,\n생각과 말과 행위로 죄를 많이 지었으며\n자주 의무를 소홀히 하였나이다.',
				instruction: '(가슴을 치며)'
			},
			{
				speaker: 'assembly',
				text: '제 탓이옵니다, 제 탓이옵니다, 제 큰 탓이옵니다.\n그러므로 간청하오니\n평생 동정이신 성모 마리아와\n모든 천사와 성인과\n형제들은 저를 위하여\n하느님께 빌어 주소서.'
			},
			{
				speaker: 'priest',
				text: '† 전능하신 하느님, 저희에게 자비를 베푸시고 저희 죄를 용서하시어 영원한 생명으로 이끌어 주소서.'
			},
			{ speaker: 'assembly', text: '○ 아멘.' }
		],
		hymn: null
	},
	{
		id: 6,
		section: '시작예식',
		sectionEn: 'Opening Rites',
		title: '자비송',
		role: 'assembly',
		posture: 'standing',
		description: '하느님의 자비를 청하는 기도입니다.',
		prayers: [
			{ speaker: 'priest', text: '† 주님, 자비를 베푸소서.' },
			{ speaker: 'assembly', text: '○ 주님, 자비를 베푸소서.' },
			{ speaker: 'priest', text: '† 그리스도님, 자비를 베푸소서.' },
			{ speaker: 'assembly', text: '○ 그리스도님, 자비를 베푸소서.' },
			{ speaker: 'priest', text: '† 주님, 자비를 베푸소서.' },
			{ speaker: 'assembly', text: '○ 주님, 자비를 베푸소서.' }
		],
		hymn: null
	},
	{
		id: 7,
		section: '시작예식',
		sectionEn: 'Opening Rites',
		title: '대영광송',
		role: 'assembly',
		posture: 'standing',
		description: '하느님께 영광을 드리는 찬미 기도입니다.',
		prayers: [
			{
				speaker: 'assembly',
				text: '○ 하늘 높은 데서는 하느님께 영광,\n땅에서는 주님께서 사랑하시는 사람들에게 평화.\n\n주님 하느님, 하늘의 임금님,\n전능하신 아버지 하느님,\n주님을 기리나이다.\n찬미하나이다.\n주님께 경배하나이다.\n영광 드리나이다.\n주님의 큰 영광을 찬양하나이다.\n\n외아들 주 예수 그리스도님,\n주 하느님, 하느님의 어린양,\n성부의 아들,\n세상의 죄를 없애시는 주님,\n저희에게 자비를 베푸소서.\n세상의 죄를 없애시는 주님,\n저희의 기도를 들어주소서.\n성부 오른편에 앉아 계신 주님,\n저희에게 자비를 베푸소서.\n\n홀로 거룩하시고,\n홀로 주님이시며,\n홀로 높으신 예수 그리스도님,\n성령과 함께\n하느님 아버지의 영광 안에 계시나이다.\n아멘.'
			}
		],
		hymn: null
	},
	{
		id: 8,
		section: '시작예식',
		sectionEn: 'Opening Rites',
		title: '본기도',
		role: 'priest',
		posture: 'standing',
		description: '사제가 오늘 미사의 기도 의향을 바칩니다.',
		prayers: [
			{ speaker: 'priest', text: '† 기도합시다.\n\n(사제가 본기도를 바칩니다)' },
			{ speaker: 'assembly', text: '○ 아멘.' }
		],
		hymn: null
	},
	{
		id: 9,
		section: '말씀전례',
		sectionEn: 'Liturgy of the Word',
		title: '제1독서',
		role: 'reader',
		posture: 'seated',
		description:
			'구약성경 또는 신약성경에서 발췌한 독서입니다. 독서 끝에 "주님의 말씀입니다"라고 하면 "하느님 감사합니다"로 응답합니다.',
		prayers: [
			{ speaker: 'priest', text: '(독서자가 독서를 읽습니다)' },
			{ speaker: 'priest', text: '† 주님의 말씀입니다.' },
			{ speaker: 'assembly', text: '○ 하느님, 감사합니다.' }
		],
		hymn: null
	},
	{
		id: 10,
		section: '말씀전례',
		sectionEn: 'Liturgy of the Word',
		title: '화답송',
		role: 'assembly',
		posture: 'seated',
		description: '시편으로 하느님 말씀에 응답합니다.',
		prayers: null,
		hymn: { type: 'responsorial', label: '화답송' }
	},
	{
		id: 11,
		section: '말씀전례',
		sectionEn: 'Liturgy of the Word',
		title: '제2독서',
		role: 'reader',
		posture: 'seated',
		description: '신약성경 서간에서 발췌한 독서입니다.',
		prayers: [
			{ speaker: 'priest', text: '(독서자가 독서를 읽습니다)' },
			{ speaker: 'priest', text: '† 주님의 말씀입니다.' },
			{ speaker: 'assembly', text: '○ 하느님, 감사합니다.' }
		],
		hymn: null
	},
	{
		id: 12,
		section: '말씀전례',
		sectionEn: 'Liturgy of the Word',
		title: '복음',
		role: 'priest',
		posture: 'standing',
		description: '복음을 듣기 위해 일어섭니다. 복음 선포 전에 이마, 입술, 가슴에 작은 십자가를 긋습니다.',
		prayers: [
			{ speaker: 'priest', text: '† 주님께서 여러분과 함께.' },
			{ speaker: 'assembly', text: '○ 또한 사제와 함께.' },
			{ speaker: 'priest', text: '† (복음서 제목) 복음입니다.' },
			{
				speaker: 'assembly',
				text: '○ 주님, 영광받으소서.',
				instruction: '(이마, 입술, 가슴에 작은 십자가를 그으며)'
			},
			{ speaker: 'priest', text: '(사제가 복음을 선포합니다)' },
			{ speaker: 'priest', text: '† 주님의 말씀입니다.' },
			{ speaker: 'assembly', text: '○ 그리스도님, 찬미합니다.' }
		],
		hymn: null
	},
	{
		id: 13,
		section: '말씀전례',
		sectionEn: 'Liturgy of the Word',
		title: '강론',
		role: 'priest',
		posture: 'seated',
		description: '사제가 복음 말씀을 바탕으로 혼인의 의미와 부부의 소명에 대해 강론합니다.',
		prayers: null,
		hymn: null
	},
	{
		id: 14,
		section: '혼인예식',
		sectionEn: 'Wedding Rite',
		title: '혼인 서약 준비',
		role: 'priest',
		posture: 'standing',
		description: '신랑신부가 제단 앞에 서고, 사제가 혼인 서약을 위한 질문을 합니다.',
		prayers: [
			{
				speaker: 'priest',
				text: '† (신랑 이름)와 (신부 이름), 두 사람은 혼인의 신성함을 알고 하느님과 교회 앞에서 혼인 서약을 하러 왔습니까?'
			},
			{ speaker: 'assembly', text: '○ 예, 그렇습니다.', instruction: '(신랑신부)' },
			{ speaker: 'priest', text: '† 두 사람은 자유로이 아무 장애 없이 혼인하렵니까?' },
			{ speaker: 'assembly', text: '○ 예, 그렇습니다.', instruction: '(신랑신부)' },
			{ speaker: 'priest', text: '† 두 사람은 평생 서로 사랑하고 존경하렵니까?' },
			{ speaker: 'assembly', text: '○ 예, 그렇습니다.', instruction: '(신랑신부)' },
			{
				speaker: 'priest',
				text: '† 두 사람은 하느님에게서 자녀를 받아 가톨릭 교회의 법에 따라 교육하렵니까?'
			},
			{ speaker: 'assembly', text: '○ 예, 그렇습니다.', instruction: '(신랑신부)' }
		],
		hymn: null
	},
	{
		id: 15,
		section: '혼인예식',
		sectionEn: 'Wedding Rite',
		title: '혼인 서약',
		role: 'couple',
		posture: 'standing',
		description: '신랑과 신부가 서로에게 혼인 서약을 합니다. 두 사람이 서로의 손을 잡고 서약합니다.',
		prayers: [
			{
				speaker: 'priest',
				text: '† 그러면 두 사람은 오른손을 마주 잡고 서로 혼인을 서약하십시오.'
			},
			{
				speaker: 'assembly',
				text: '○ (신랑) (신부 이름), 나 (신랑 이름)는 이 좋은 날에\n그대를 나의 아내로 맞이합니다.\n이제부터 기쁠 때나 슬플 때나,\n아플 때나 건강할 때나,\n평생 변함없이\n그대를 사랑하고 존경하겠습니다.\n이 서약을 하느님 앞에 합니다.'
			},
			{
				speaker: 'assembly',
				text: '○ (신부) (신랑 이름), 나 (신부 이름)는 이 좋은 날에\n그대를 나의 남편으로 맞이합니다.\n이제부터 기쁠 때나 슬플 때나,\n아플 때나 건강할 때나,\n평생 변함없이\n그대를 사랑하고 존경하겠습니다.\n이 서약을 하느님 앞에 합니다.'
			}
		],
		hymn: null
	},
	{
		id: 16,
		section: '혼인예식',
		sectionEn: 'Wedding Rite',
		title: '혼인 성립 선언',
		role: 'priest',
		posture: 'standing',
		description: '사제가 두 사람의 혼인이 성립되었음을 선언합니다.',
		prayers: [
			{
				speaker: 'priest',
				text: '† 하느님께서 맺어 주신 것을 사람이 끊지 못할지니,\n이 두 사람이 나눈 혼인 서약을 하느님과 교회의 이름으로 확인합니다.\n하느님께서 맺어 주신 이 인연을 사람이 끊지 못할 것입니다.'
			},
			{ speaker: 'assembly', text: '○ 아멘.' }
		],
		hymn: null
	},
	{
		id: 17,
		section: '혼인예식',
		sectionEn: 'Wedding Rite',
		title: '반지 축복과 교환',
		role: 'couple',
		posture: 'standing',
		description: '사제가 반지를 축복하고, 신랑신부가 반지를 교환합니다.',
		prayers: [
			{
				speaker: 'priest',
				text: '† 주님, 이 반지를 축복하시어 두 사람이 서로 변함없이 사랑하게 하시고 주님의 평화 안에서 살게 하소서.'
			},
			{ speaker: 'assembly', text: '○ 아멘.' },
			{
				speaker: 'assembly',
				text: '○ (신랑이 신부에게)\n(신부 이름), 내 사랑의 표시로 이 반지를 받으시오.',
				instruction: '(신랑이 신부 손가락에 반지를 끼워주며)'
			},
			{
				speaker: 'assembly',
				text: '○ (신부가 신랑에게)\n(신랑 이름), 내 사랑의 표시로 이 반지를 받으시오.',
				instruction: '(신부가 신랑 손가락에 반지를 끼워주며)'
			}
		],
		hymn: null
	},
	{
		id: 18,
		section: '혼인예식',
		sectionEn: 'Wedding Rite',
		title: '신자들의 기도',
		role: 'reader',
		posture: 'standing',
		description: '온 교회와 세상을 위해, 그리고 새 부부를 위해 기도합니다.',
		prayers: [
			{
				speaker: 'priest',
				text: '† 사랑하는 형제 여러분, 오늘 혼인 서약을 한 두 사람을 위해 하느님께 기도합시다.'
			},
			{ speaker: 'priest', text: '(독서자가 기도 의향을 읽습니다)' },
			{ speaker: 'assembly', text: '○ 주님, 저희의 기도를 들어주소서.' }
		],
		hymn: null
	},
	{
		id: 19,
		section: '혼인예식',
		sectionEn: 'Wedding Rite',
		title: '신자들의 기도 마침',
		role: 'priest',
		posture: 'standing',
		description: '사제가 신자들의 기도를 마무리합니다.',
		prayers: [
			{
				speaker: 'priest',
				text: '† 주 하느님, 저희의 기도를 들으시고 이 두 사람을 은총으로 보살펴 주소서. 우리 주 그리스도를 통하여 비나이다.'
			},
			{ speaker: 'assembly', text: '○ 아멘.' }
		],
		hymn: null
	},
	{
		id: 20,
		section: '성찬전례',
		sectionEn: 'Liturgy of the Eucharist',
		title: '예물 준비',
		role: null,
		posture: 'seated',
		description: '빵과 포도주를 제단에 봉헌합니다. 신자들의 헌금도 이때 봉헌됩니다.',
		prayers: null,
		hymn: { type: 'offertory', label: '봉헌성가' }
	},
	{
		id: 21,
		section: '성찬전례',
		sectionEn: 'Liturgy of the Eucharist',
		title: '예물기도',
		role: 'priest',
		posture: 'standing',
		description: '사제가 봉헌된 예물을 위해 기도합니다.',
		prayers: [
			{
				speaker: 'priest',
				text: '† 형제 여러분, 우리가 바치는 이 제사를 전능하신 하느님 아버지께서 기꺼이 받아 주시도록 기도합시다.'
			},
			{
				speaker: 'assembly',
				text: '○ 우리와 온 교회의 유익을 위하여\n사제의 손을 통해 바치는 이 제사를\n주님께서 받아 주시기를 바랍니다.'
			},
			{ speaker: 'priest', text: '(사제가 예물기도를 바칩니다)' },
			{ speaker: 'assembly', text: '○ 아멘.' }
		],
		hymn: null
	},
	{
		id: 22,
		section: '성찬전례',
		sectionEn: 'Liturgy of the Eucharist',
		title: '감사송',
		role: 'priest',
		posture: 'standing',
		description: '하느님께 감사와 찬미를 드리는 기도입니다.',
		prayers: [
			{ speaker: 'priest', text: '† 주님께서 여러분과 함께.' },
			{ speaker: 'assembly', text: '○ 또한 사제와 함께.' },
			{ speaker: 'priest', text: '† 마음을 드높이.' },
			{ speaker: 'assembly', text: '○ 주님께 올립니다.' },
			{ speaker: 'priest', text: '† 우리 주 하느님께 감사합시다.' },
			{ speaker: 'assembly', text: '○ 마땅하고 옳은 일입니다.' },
			{ speaker: 'priest', text: '(사제가 감사송을 바칩니다)' }
		],
		hymn: null
	},
	{
		id: 23,
		section: '성찬전례',
		sectionEn: 'Liturgy of the Eucharist',
		title: '거룩하시도다',
		role: 'assembly',
		posture: 'standing',
		description: '하늘과 땅이 주님의 영광으로 가득함을 노래합니다.',
		prayers: [
			{
				speaker: 'assembly',
				text: '○ 거룩하시도다, 거룩하시도다, 거룩하시도다.\n온 누리의 주 하느님.\n하늘과 땅에 가득 찬 그 영광.\n높은 데서 호산나.\n주님의 이름으로 오시는 분, 찬미받으소서.\n높은 데서 호산나.'
			}
		],
		hymn: null
	},
	{
		id: 24,
		section: '성찬전례',
		sectionEn: 'Liturgy of the Eucharist',
		title: '축성',
		role: 'priest',
		posture: 'kneeling',
		description: '빵과 포도주가 그리스도의 몸과 피로 축성되는 가장 거룩한 순간입니다. 종이 울리면 무릎을 꿇습니다.',
		prayers: [
			{
				speaker: 'priest',
				text: '† (축성 기도)\n\n이는 너희를 위하여 내어 줄 내 몸이다.\n\n(종이 울립니다 - 무릎을 꿇습니다)\n\n이는 새롭고 영원한 계약을 맺는 내 피의 잔이니\n죄를 사하여 주려고 너희와 모든 이를 위하여 흘릴 피다.\n너희는 나를 기억하여 이를 행하여라.\n\n(종이 울립니다)'
			},
			{ speaker: 'priest', text: '† 신앙의 신비여.' },
			{
				speaker: 'assembly',
				text: '○ 주님께서 오실 때까지\n주님의 죽음을 전하며\n부활을 선포하나이다.'
			}
		],
		hymn: null
	},
	{
		id: 25,
		section: '성찬전례',
		sectionEn: 'Liturgy of the Eucharist',
		title: '마침 영광송',
		role: 'priest',
		posture: 'standing',
		description: '감사기도의 마무리로 하느님께 영광을 드립니다.',
		prayers: [
			{
				speaker: 'priest',
				text: '† 그리스도를 통하여, 그리스도와 함께, 그리스도 안에서,\n성령으로 하나 되어,\n전능하신 하느님 아버지,\n모든 영예와 영광을 영원히 받으소서.'
			},
			{ speaker: 'assembly', text: '○ 아멘.' }
		],
		hymn: null
	},
	{
		id: 26,
		section: '영성체 예식',
		sectionEn: 'Communion Rite',
		title: '주님의 기도',
		role: 'assembly',
		posture: 'standing',
		description: '예수님께서 가르쳐 주신 기도를 함께 바칩니다.',
		prayers: [
			{
				speaker: 'priest',
				text: '† 구원의 말씀에 따라 구세주께서 가르쳐 주신 대로 삼가 아뢰오니,'
			},
			{
				speaker: 'assembly',
				text: '○ 하늘에 계신 우리 아버지,\n아버지의 이름이 거룩히 빛나시며\n아버지의 나라가 오시며\n아버지의 뜻이 하늘에서와 같이\n땅에서도 이루어지소서.\n오늘 저희에게 일용할 양식을 주시고\n저희에게 잘못한 이를 저희가 용서하오니\n저희 죄를 용서하시고\n저희를 유혹에 빠지지 않게 하시고\n악에서 구하소서.'
			},
			{
				speaker: 'priest',
				text: '† 주님, 저희를 모든 악에서 구하시고 살아가는 동안 평화롭게 하소서. 주님의 자비로 저희를 언제나 죄에서 보호하시어 영원한 생명을 바라며 구세주 예수 그리스도의 오심을 기다리게 하소서.'
			},
			{ speaker: 'assembly', text: '○ 나라와 권능과 영광이 영원히 아버지의 것이니이다.' }
		],
		hymn: null
	},
	{
		id: 27,
		section: '영성체 예식',
		sectionEn: 'Communion Rite',
		title: '평화예식',
		role: 'assembly',
		posture: 'standing',
		description: '그리스도의 평화를 서로 나눕니다. 옆 사람에게 인사하며 "주님의 평화가 함께"라고 말합니다.',
		prayers: [
			{ speaker: 'priest', text: '† 주님의 평화가 언제나 여러분과 함께.' },
			{ speaker: 'assembly', text: '○ 또한 사제와 함께.' },
			{ speaker: 'priest', text: '† 서로 평화의 인사를 나누십시오.' },
			{ speaker: 'assembly', text: '(서로에게) 주님의 평화가 함께.' }
		],
		hymn: null
	},
	{
		id: 28,
		section: '영성체 예식',
		sectionEn: 'Communion Rite',
		title: '하느님의 어린양',
		role: 'assembly',
		posture: 'standing',
		description: '성체를 모시기 전, 하느님의 어린양이신 예수님께 죄의 용서를 청합니다.',
		prayers: [
			{
				speaker: 'assembly',
				text: '○ 하느님의 어린양,\n세상의 죄를 없애시는 주님,\n자비를 베푸소서.\n\n하느님의 어린양,\n세상의 죄를 없애시는 주님,\n자비를 베푸소서.\n\n하느님의 어린양,\n세상의 죄를 없애시는 주님,\n평화를 주소서.'
			}
		],
		hymn: null
	},
	{
		id: 29,
		section: '영성체 예식',
		sectionEn: 'Communion Rite',
		title: '영성체',
		role: 'assembly',
		posture: null,
		description:
			'그리스도의 몸과 피를 받아 모십니다.\n\n✝ 가톨릭 신자: 앞으로 나가 영성체합니다.\n• "그리스도의 몸" → "아멘"\n• "그리스도의 피" → "아멘"\n\n※ 영성체를 할 수 없는 분(비신자, 고해성사 미수, 금식 미준수):\n• 자리에서 함께 기도하시거나,\n• 영성체 행렬에 나가 팔짱을 끼면 축복을 받을 수 있습니다.',
		prayers: [
			{
				speaker: 'priest',
				text: '† 하느님의 어린양, 세상의 죄를 없애시는 분이시니, 이 성찬에 초대받은 이들은 복되도다.'
			},
			{
				speaker: 'assembly',
				text: '○ 주님, 제 안에 주님을 모시기에 합당치 않사오나\n한 말씀만 하소서.\n제 영혼이 곧 나으리이다.'
			}
		],
		hymn: { type: 'communion', label: '영성체 성가' }
	},
	{
		id: 30,
		section: '영성체 예식',
		sectionEn: 'Communion Rite',
		title: '영성체 후 기도',
		role: 'priest',
		posture: 'standing',
		description: '영성체 후 감사의 기도를 드립니다.',
		prayers: [
			{ speaker: 'priest', text: '† 기도합시다.\n\n(사제가 영성체 후 기도를 바칩니다)' },
			{ speaker: 'assembly', text: '○ 아멘.' }
		],
		hymn: null
	},
	{
		id: 31,
		section: '마침예식',
		sectionEn: 'Concluding Rites',
		title: '신랑신부 강복',
		role: 'priest',
		posture: 'kneeling',
		description: '사제가 새 부부에게 특별한 강복을 합니다. 신랑신부는 무릎을 꿇고 강복을 받습니다.',
		prayers: [
			{
				speaker: 'priest',
				text: '† 하느님께서 두 사람을 영원한 사랑으로 맺어 주셨으니,\n화목하게 살며 서로 진실되게 사랑하십시오.\n\n자녀를 주시어 그리스도인으로 교육하게 하시고\n두 사람의 가정에 언제나 기쁨과 평화가 넘치게 하소서.\n\n우리 주 그리스도를 통하여 비나이다.'
			},
			{ speaker: 'assembly', text: '○ 아멘.' }
		],
		hymn: null
	},
	{
		id: 32,
		section: '마침예식',
		sectionEn: 'Concluding Rites',
		title: '파견과 축복',
		role: 'priest',
		posture: 'standing',
		description: '미사를 마치고 세상으로 파견됩니다.',
		prayers: [
			{ speaker: 'priest', text: '† 주님께서 여러분과 함께.' },
			{ speaker: 'assembly', text: '○ 또한 사제와 함께.' },
			{
				speaker: 'priest',
				text: '† 전능하신 천주 성부와 성자와 성령께서 여기 모인 모든 분에게 강복하소서.'
			},
			{ speaker: 'assembly', text: '○ 아멘.' },
			{ speaker: 'priest', text: '† 미사가 끝났으니 가서 복음을 전합시다.' },
			{ speaker: 'assembly', text: '○ 하느님, 감사합니다.' }
		],
		hymn: { type: 'recessional', label: '퇴장성가' }
	}
];

export const getRoleLabel = (role: MassStep['role']): string => {
	switch (role) {
		case 'priest':
			return '사제';
		case 'assembly':
			return '회중';
		case 'reader':
			return '독서자';
		case 'couple':
			return '신랑신부';
		case 'narrator':
			return '해설자';
		default:
			return '';
	}
};

export const getPostureLabel = (posture: MassStep['posture']): string => {
	switch (posture) {
		case 'standing':
			return '기립';
		case 'seated':
			return '착석';
		case 'kneeling':
			return '무릎';
		default:
			return '';
	}
};
