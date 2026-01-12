import type { MassStep, HymnPlaceholder } from './massSteps';

export const sectionsMerged = [
	{ name: '시작예식', nameEn: 'Opening Rites', range: [1, 5] },
	{ name: '말씀전례', nameEn: 'Liturgy of the Word', range: [6, 8] },
	{ name: '혼인예식', nameEn: 'Wedding Rite', range: [9, 11] },
	{ name: '성찬전례', nameEn: 'Liturgy of the Eucharist', range: [12, 14] },
	{ name: '영성체 예식', nameEn: 'Communion Rite', range: [15, 17] },
	{ name: '마침예식', nameEn: 'Concluding Rites', range: [18, 18] }
];

export const massStepsMerged: MassStep[] = [
	// ═══════════════════════════════════════════════════════════════
	// 【시작예식】 Opening Rites (1-5)
	// ═══════════════════════════════════════════════════════════════
	{
		id: 1,
		section: '시작예식',
		sectionEn: 'Opening Rites',
		title: '혼배안내',
		role: 'narrator',
		posture: null,
		description: '미사 시작 전 참례자들에게 혼배미사의 의미와 진행 순서를 안내합니다.',
		prayers: null,
		hymn: null
	},
	{
		id: 2,
		section: '시작예식',
		sectionEn: 'Opening Rites',
		title: '입당성가 · 신랑신부 입장',
		role: 'assembly',
		posture: 'standing',
		description:
			'주례사제가 제대로 나아가는 동안 함께 부르는 성가입니다. 이어서 신랑신부가 부모님과 함께 또는 단독으로 제대 앞으로 입장합니다.',
		prayers: null,
		hymn: { type: 'entrance', label: '입당성가' }
	},
	{
		id: 3,
		section: '시작예식',
		sectionEn: 'Opening Rites',
		title: '인사 · 참회예식',
		role: 'assembly',
		posture: 'standing',
		description:
			'사제가 신자들에게 주님의 현존을 선포하며 인사합니다. 이어서 자신의 잘못을 고백하고 하느님의 자비를 청합니다.',
		prayers: [
			{ speaker: 'priest', text: '† 주님께서 여러분과 함께' },
			{ speaker: 'assembly', text: '○ 또한 사제와 함께' },
			{ speaker: 'priest', text: '† (사제의 권고)' },
			{
				speaker: 'assembly',
				text: '○ 전능하신 하느님과 형제들에게 고백하오니, 생각과 말과 행위로 죄를 많이 지었으며 자주 의무를 소홀히 하였나이다.',
				instruction: '(가슴을 치며)'
			},
			{
				speaker: 'assembly',
				text: '제 탓이오, 제 탓이오, 저의 큰 탓이옵니다. 그러므로 간절히 바라오니 평생 동정이신 성모 마리아와 모든 천사와 성인과 형제들은 저를 위하여 하느님께 빌어주소서.'
			},
			{
				speaker: 'priest',
				text: '† 전능하신 하느님, 저희에게 자비를 베푸시어 죄를 용서하시고 영원한 생명으로 이끌어 주소서.'
			},
			{ speaker: 'assembly', text: '○ 아멘.' }
		],
		hymn: null
	},
	{
		id: 4,
		section: '시작예식',
		sectionEn: 'Opening Rites',
		title: '자비송 · 대영광송',
		role: 'assembly',
		posture: 'standing',
		description: '하느님의 자비를 청하고 영광을 드리는 찬미가입니다.',
		prayers: [
			{ speaker: 'assembly', text: '○ 주님, 자비를 베푸소서.\n○ 주님, 자비를 베푸소서.' },
			{
				speaker: 'assembly',
				text: '○ 그리스도님, 자비를 베푸소서.\n○ 그리스도님, 자비를 베푸소서.'
			},
			{ speaker: 'assembly', text: '○ 주님, 자비를 베푸소서.\n○ 주님, 자비를 베푸소서.' },
			{
				speaker: 'assembly',
				text: '○ 하늘 높은 데서는 하느님께 영광,\n땅에서는 주님께서 사랑하시는 사람들에게 평화.\n\n주님의 큰 영광을 위하여\n주님을 찬미하며 찬송하며\n주님을 흠숭하며 경배하며 영광 드리나이다.\n\n전능하신 아버지 하느님,\n주님께 감사하나이다.\n\n외아들 주 예수 그리스도님,\n하느님의 어린양, 성부의 아드님,\n세상의 죄를 없애시는 주님,\n저희에게 자비를 베푸소서.\n\n세상의 죄를 없애시는 주님,\n저희의 기도를 들어주소서.\n\n성부 오른편에 앉아 계신 주님,\n저희에게 자비를 베푸소서.\n\n홀로 거룩하시고, 홀로 주님이시며,\n홀로 높으신 예수 그리스도님,\n성령과 함께 아버지 하느님의 영광 안에 계시나이다.\n\n아멘.'
			}
		],
		hymn: null
	},
	{
		id: 5,
		section: '시작예식',
		sectionEn: 'Opening Rites',
		title: '본기도',
		role: 'priest',
		posture: 'standing',
		description: '시작예식을 마무리하며 그날 미사의 주제를 담은 기도를 바칩니다.',
		prayers: [
			{ speaker: 'priest', text: '† 기도합시다.\n\n(사제가 본기도를 바칩니다)' },
			{ speaker: 'assembly', text: '○ 아멘.' }
		],
		hymn: null
	},

	// ═══════════════════════════════════════════════════════════════
	// 【말씀전례】 Liturgy of the Word (6-8)
	// ═══════════════════════════════════════════════════════════════
	{
		id: 6,
		section: '말씀전례',
		sectionEn: 'Liturgy of the Word',
		title: '독서 · 화답송',
		role: 'reader',
		posture: 'seated',
		description:
			'구약성경 또는 신약성경의 서간에서 발췌한 말씀을 봉독하고, 이에 대한 응답으로 시편을 노래합니다.',
		prayers: [
			{ speaker: 'priest', text: '(독서자가 독서를 봉독합니다)' },
			{ speaker: 'assembly', text: '○ 하느님 감사합니다.' }
		],
		hymn: { type: 'responsorial', label: '화답송' }
	},
	{
		id: 7,
		section: '말씀전례',
		sectionEn: 'Liturgy of the Word',
		title: '복음환호송 · 복음',
		role: 'priest',
		posture: 'standing',
		description:
			'복음 선포를 맞이하며 "알렐루야"를 노래하고, 사제가 예수 그리스도의 말씀과 행적을 전하는 복음서를 선포합니다.',
		prayers: [
			{ speaker: 'assembly', text: '○ 알렐루야, 알렐루야, 알렐루야.' },
			{ speaker: 'priest', text: '† 주님께서 여러분과 함께' },
			{ speaker: 'assembly', text: '○ 또한 사제와 함께' },
			{ speaker: 'priest', text: '† ○○○가 전한 거룩한 복음입니다.' },
			{
				speaker: 'assembly',
				text: '○ 주님, 영광받으소서.',
				instruction:
					'(이때 엄지로 이마, 입술, 가슴에 작은 십자를 긋습니다. 주님의 말씀을 마음으로 깨닫고, 입으로 고백하며, 가슴에 새기겠다는 의미입니다.)'
			},
			{ speaker: 'priest', text: '(복음 봉독 후)' },
			{ speaker: 'priest', text: '† 주님의 말씀입니다.' },
			{ speaker: 'assembly', text: '○ 그리스도님, 찬미합니다.' }
		],
		hymn: null
	},
	{
		id: 8,
		section: '말씀전례',
		sectionEn: 'Liturgy of the Word',
		title: '혼인강론',
		role: 'priest',
		posture: 'seated',
		description: '사제가 말씀을 바탕으로 혼인성사의 의미와 부부의 소명에 대해 설교합니다.',
		prayers: null,
		hymn: null
	},

	// ═══════════════════════════════════════════════════════════════
	// 【혼인예식】 Wedding Rite (9-11)
	// ═══════════════════════════════════════════════════════════════
	{
		id: 9,
		section: '혼인예식',
		sectionEn: 'Wedding Rite',
		title: '혼인 서약',
		role: 'couple',
		posture: 'standing',
		description:
			'자유의사, 평생 충실, 자녀 출산과 교육에 대한 의향을 확인하고, 신랑신부가 서로 혼인 서약을 합니다. 사제가 혼인을 승인하고 반지를 축복합니다.',
		prayers: [
			{ speaker: 'priest', text: '† "두 사람은 자유로운 의사로 혼인합니까?"' },
			{ speaker: 'assembly', text: '○ 예, 그렇습니다.', instruction: '(신랑신부)' },
			{ speaker: 'priest', text: '† "평생 서로 사랑하고 존경하며 충실하겠습니까?"' },
			{ speaker: 'assembly', text: '○ 예, 그렇습니다.', instruction: '(신랑신부)' },
			{
				speaker: 'priest',
				text: '† "하느님께서 주시는 자녀를 기꺼이 받아 교회의 가르침에 따라 양육하겠습니까?"'
			},
			{ speaker: 'assembly', text: '○ 예, 그렇습니다.', instruction: '(신랑신부)' },
			{
				speaker: 'assembly',
				text: '"○○○, 나는 당신을 나의 아내(남편)로 받아들입니다. 기쁠 때나 슬플 때나, 건강할 때나 아플 때나, 평생 당신을 사랑하고 존경하겠습니다."',
				instruction: '(신랑신부가 서로에게)'
			},
			{
				speaker: 'priest',
				text: '† 주례사제는 두 분이 교회법에 따라 합법적인 부부임을 여러분 앞에서 선포합니다.'
			},
			{ speaker: 'assembly', text: '○ 아멘.' },
			{ speaker: 'priest', text: '† (사제가 반지를 축복합니다)' },
			{
				speaker: 'assembly',
				text: '"이 반지를 너에게 주노니, 나의 사랑과 신의의 표지로 받아라. 성부와 성자와 성령의 이름으로."',
				instruction: '(신랑신부가 서로에게 반지를 끼워주며)'
			}
		],
		hymn: null
	},
	{
		id: 10,
		section: '혼인예식',
		sectionEn: 'Wedding Rite',
		title: '면사포 예식',
		role: null,
		posture: null,
		description:
			'신부의 어머니가 면사포를 벗기고 시어머니가 다시 씌워주는 전통 예식입니다. (해당 시 진행)',
		prayers: null,
		hymn: null
	},
	{
		id: 11,
		section: '혼인예식',
		sectionEn: 'Wedding Rite',
		title: '보편지향기도',
		role: 'narrator',
		posture: 'standing',
		description: '교회와 세상, 신랑신부를 위해 공동체가 함께 바치는 기도입니다.',
		prayers: [
			{ speaker: 'priest', text: '(해설자가 기도 의향을 읽습니다)' },
			{ speaker: 'assembly', text: '○ 주님, 저희의 기도를 들어주소서.' },
			{ speaker: 'priest', text: '† (사제가 마침 기도를 바칩니다)' },
			{ speaker: 'assembly', text: '○ 아멘.' }
		],
		hymn: null
	},

	// ═══════════════════════════════════════════════════════════════
	// 【성찬전례】 Liturgy of the Eucharist (12-14)
	// ═══════════════════════════════════════════════════════════════
	{
		id: 12,
		section: '성찬전례',
		sectionEn: 'Liturgy of the Eucharist',
		title: '예물 준비 · 예물 기도',
		role: 'assembly',
		posture: 'seated',
		description:
			'빵과 포도주, 그리고 신자들의 헌금을 제대로 봉헌하고, 봉헌된 예물이 하느님께 받아들여지도록 기도합니다.',
		prayers: [
			{
				speaker: 'priest',
				text: '† 형제 여러분, 우리가 바치는 이 제사를 전능하신 아버지 하느님께서 기꺼이 받아 주시도록 기도합시다.'
			},
			{
				speaker: 'assembly',
				text: '○ 사제의 손을 통하여 바치는 이 제사가 하느님의 이름을 찬미하고 영광되게 하며, 저희와 온 교회에 도움이 되게 하소서.'
			}
		],
		hymn: { type: 'offertory', label: '예물성가' }
	},
	{
		id: 13,
		section: '성찬전례',
		sectionEn: 'Liturgy of the Eucharist',
		title: '감사기도 · 거룩하시도다',
		role: 'assembly',
		posture: 'standing',
		description:
			'혼배미사에서 사용하는 고유 감사송으로, 혼인성사의 신비와 부부 사랑의 거룩함을 선포합니다. 이어서 하느님의 거룩하심을 찬미합니다.',
		prayers: [
			{ speaker: 'priest', text: '† 주님께서 여러분과 함께' },
			{ speaker: 'assembly', text: '○ 또한 사제와 함께' },
			{ speaker: 'priest', text: '† 마음을 드높이' },
			{ speaker: 'assembly', text: '○ 주님께 올립니다.' },
			{ speaker: 'priest', text: '† 우리 주 하느님께 감사합시다.' },
			{ speaker: 'assembly', text: '○ 마땅하고 옳은 일입니다.' },
			{
				speaker: 'assembly',
				text: '○ 거룩하시도다, 거룩하시도다, 거룩하시도다,\n온 누리의 주 하느님,\n하늘과 땅에 가득 찬 그 영광.\n높은 데서 호산나.\n주님의 이름으로 오시는 분,\n찬미받으소서.\n높은 데서 호산나.'
			}
		],
		hymn: null
	},
	{
		id: 14,
		section: '성찬전례',
		sectionEn: 'Liturgy of the Eucharist',
		title: '축성 · 신앙의 신비여',
		role: 'assembly',
		posture: 'kneeling',
		description:
			'미사의 가장 거룩한 순간입니다. 사제가 빵과 포도주를 축성하여 그리스도의 몸과 피가 됩니다. 종소리가 울립니다.',
		prayers: [
			{
				speaker: 'priest',
				text: '† 너희는 모두 이것을 받아 먹어라. 이는 너희를 위하여 내어 줄 내 몸이다.'
			},
			{
				speaker: 'priest',
				text: '† 너희는 모두 이것을 받아 마셔라. 이는 새롭고 영원한 계약을 맺는 내 피의 잔이니 죄를 사하여 주려고 너희와 많은 이를 위하여 흘릴 피다. 너희는 나를 기억하여 이를 행하여라.'
			},
			{ speaker: 'priest', text: '† 신앙의 신비여!' },
			{
				speaker: 'assembly',
				text: '○ 주님께서 오실 때까지 주님의 죽음을 전하며 부활을 선포하나이다.'
			}
		],
		hymn: null
	},

	// ═══════════════════════════════════════════════════════════════
	// 【영성체 예식】 Communion Rite (15-17)
	// ═══════════════════════════════════════════════════════════════
	{
		id: 15,
		section: '영성체 예식',
		sectionEn: 'Communion Rite',
		title: '주님의 기도 · 평화의 인사 · 하느님의 어린양',
		role: 'assembly',
		posture: 'standing',
		description:
			'예수님께서 가르쳐 주신 기도를 공동체가 함께 바치고, 그리스도의 평화를 서로 나누며, 영성체 직전 그리스도께 자비를 청합니다.',
		prayers: [
			{
				speaker: 'assembly',
				text: '○ 하늘에 계신 우리 아버지,\n아버지의 이름이 거룩히 빛나시며,\n아버지의 나라가 오시며,\n아버지의 뜻이 하늘에서와 같이\n땅에서도 이루어지소서.\n\n오늘 저희에게 일용할 양식을 주시고,\n저희에게 잘못한 이를 저희가 용서하오니\n저희 죄를 용서하시고,\n저희를 유혹에 빠지지 않게 하시고\n악에서 구하소서.'
			},
			{
				speaker: 'priest',
				text: '† 주님, 저희를 모든 악에서 구하시고 현세에 평화를 베푸소서. 주님의 자비로 저희를 언제나 죄에서 보호하시고 모든 시련에서 구하소서. 저희가 복된 희망을 품고 구세주 예수 그리스도의 오심을 기다리나이다.'
			},
			{ speaker: 'assembly', text: '○ 주님께 나라와 권능과 영광이 영원히. 아멘.' },
			{ speaker: 'priest', text: '† 주님의 평화가 항상 여러분과 함께' },
			{ speaker: 'assembly', text: '○ 또한 사제와 함께' },
			{
				speaker: 'priest',
				text: '† 서로 평화의 인사를 나누십시오.',
				instruction: '(옆 사람에게 가볍게 목례하거나 "평화를 빕니다"라고 인사합니다)'
			},
			{
				speaker: 'assembly',
				text: '○ 하느님의 어린양, 세상의 죄를 없애시는 주님,\n자비를 베푸소서.\n\n하느님의 어린양, 세상의 죄를 없애시는 주님,\n자비를 베푸소서.\n\n하느님의 어린양, 세상의 죄를 없애시는 주님,\n평화를 주소서.'
			}
		],
		hymn: null
	},
	{
		id: 16,
		section: '영성체 예식',
		sectionEn: 'Communion Rite',
		title: '영성체',
		role: 'assembly',
		posture: null,
		description:
			'축성된 빵과 포도주, 곧 그리스도의 몸과 피를 받아 모시는 거룩한 순간입니다.\n\n✝ 세례 받은 가톨릭 신자: 영성체 가능\n• 사제: "그리스도의 몸" → 본인: "아멘"\n• 손바닥을 포개어 받거나(왼손 위에 오른손) 입으로 직접 받음\n\n※ 세례 받지 않은 분:\n• 두 팔을 가슴에 교차하고 나가시면 사제에게 축복을 받으실 수 있습니다.\n• 자리에 계셔도 됩니다.',
		prayers: [
			{
				speaker: 'priest',
				text: '† 하느님의 어린양, 세상의 죄를 없애시는 분이시니, 이 성찬에 초대받은 이는 복되도다.'
			},
			{
				speaker: 'assembly',
				text: '○ 주님, 제 안에 주님을 모시기에 합당치 않사오나, 한 말씀만 하소서. 제가 나으리이다.'
			}
		],
		hymn: { type: 'communion', label: '영성체송' }
	},
	{
		id: 17,
		section: '영성체 예식',
		sectionEn: 'Communion Rite',
		title: '영성체 후 기도',
		role: 'priest',
		posture: 'standing',
		description: '영성체의 은혜에 감사하며 바치는 기도입니다.',
		prayers: [
			{ speaker: 'priest', text: '† 기도합시다.\n\n(사제가 영성체 후 기도를 바칩니다)' },
			{ speaker: 'assembly', text: '○ 아멘.' }
		],
		hymn: null
	},

	// ═══════════════════════════════════════════════════════════════
	// 【마침예식】 Concluding Rites (18)
	// ═══════════════════════════════════════════════════════════════
	{
		id: 18,
		section: '마침예식',
		sectionEn: 'Concluding Rites',
		title: '신랑신부 강복 · 파견',
		role: 'priest',
		posture: 'standing',
		description:
			'새 부부에게 하느님의 특별한 축복을 내려 주고, 미사의 끝을 선포하며 세상에 복음을 전하도록 파견합니다.',
		prayers: [
			{
				speaker: 'priest',
				text: '† 전능하신 천주 성부와 성자와 성령께서 여러분에게 강복하소서.'
			},
			{ speaker: 'assembly', text: '○ 아멘.', instruction: '(성호를 긋습니다)' },
			{ speaker: 'priest', text: '† 미사가 끝났으니 가서 복음을 전합시다.' },
			{ speaker: 'assembly', text: '○ 하느님 감사합니다.' }
		],
		hymn: { type: 'recessional', label: '퇴장성가' }
	}
];
