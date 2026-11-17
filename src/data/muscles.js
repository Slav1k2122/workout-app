// Групи для вибору в інтерфейсі (порядок = порядок показу)
export const GROUPS = [
  { id: 'chest', name: 'Груди' },
  { id: 'back', name: 'Спина' },
  { id: 'legs', name: 'Ноги' },
  { id: 'glutes', name: 'Сідниці' },
  { id: 'shoulders', name: 'Плечі' },
  { id: 'biceps', name: 'Біцепс' },
  { id: 'triceps', name: 'Трицепс' },
  { id: 'abs', name: 'Прес' },
]
export const GROUP_NAMES = Object.fromEntries(GROUPS.map((g) => [g.id, g.name]))

// Анатомічні м'язи (id використовуються в SVG-силуеті, етап 4)
export const MUSCLES = {
  chest: 'Грудні',
  front_delts: 'Передні дельти',
  side_delts: 'Середні дельти',
  rear_delts: 'Задні дельти',
  biceps: 'Біцепс',
  triceps: 'Трицепс',
  forearms: 'Передпліччя',
  abs: 'Прямий м’яз живота',
  obliques: 'Косі м’язи живота',
  traps: 'Трапеції',
  lats: 'Найширші',
  upper_back: 'Середина спини (ромбоподібні)',
  lower_back: 'Розгиначі спини',
  glutes: 'Сідничні',
  quads: 'Квадрицепси',
  hamstrings: 'Біцепс стегна',
  adductors: 'Привідні м’язи стегна',
  calves: 'Литкові',
}

export const EQUIPMENT = {
  barbell: 'Штанга',
  dumbbell: 'Гантелі',
  ezbar: 'EZ-гриф',
  machine: 'Тренажер',
  cable: 'Блок',
  bodyweight: 'Власна вага',
  kettlebell: 'Гиря',
  smith: 'Сміт',
  band: 'Гума',
  other: 'Інше',
}
