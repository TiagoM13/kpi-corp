export type Activity = {
	id: string;
	when: string;
	memberId: string;
	kpiId: string;
	giver: string;
	context: string;
};

export const MOCK_ACTIVITY: Activity[] = [
	{
		id: "a1",
		when: "agora",
		memberId: "u3",
		kpiId: "k3",
		giver: "Você",
		context: "Daily",
	},
	{
		id: "a2",
		when: "há 4min",
		memberId: "u2",
		kpiId: "k7",
		giver: "Você",
		context: "Incidente #482",
	},
	{
		id: "a3",
		when: "há 12min",
		memberId: "u5",
		kpiId: "k5",
		giver: "Você",
		context: "Sprint 24",
	},
	{
		id: "a4",
		when: "há 38min",
		memberId: "u1",
		kpiId: "k6",
		giver: "Você",
		context: "Onboarding Lucas",
	},
	{
		id: "a5",
		when: "há 2h",
		memberId: "u4",
		kpiId: "k4",
		giver: "Você",
		context: "Pair com Isabela",
	},
	{
		id: "a6",
		when: "há 4h",
		memberId: "u7",
		kpiId: "k9",
		giver: "Você",
		context: "Code review",
	},
	{
		id: "a7",
		when: "há 6h",
		memberId: "u3",
		kpiId: "k8",
		giver: "Você",
		context: "Wiki design system",
	},
	{
		id: "a8",
		when: "ontem 17:42",
		memberId: "u6",
		kpiId: "k5",
		giver: "Você",
		context: "Sprint 24",
	},
	{
		id: "a9",
		when: "ontem 14:10",
		memberId: "u1",
		kpiId: "k1",
		giver: "Você",
		context: "Daily",
	},
	{
		id: "a10",
		when: "ontem 14:10",
		memberId: "u2",
		kpiId: "k1",
		giver: "Você",
		context: "Daily",
	},
	{
		id: "a11",
		when: "ontem 14:10",
		memberId: "u3",
		kpiId: "k1",
		giver: "Você",
		context: "Daily",
	},
	{
		id: "a12",
		when: "ontem 09:00",
		memberId: "u5",
		kpiId: "k3",
		giver: "Você",
		context: "Planning",
	},
];
