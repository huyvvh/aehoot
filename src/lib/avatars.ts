export const AVATARS = [
  { id: "cat", name: "Mèo", src: "/avatars/cat.svg" },
  { id: "dog", name: "Chó", src: "/avatars/dog.svg" },
  { id: "bear", name: "Gấu", src: "/avatars/bear.svg" },
  { id: "rabbit", name: "Thỏ", src: "/avatars/rabbit.svg" },
  { id: "fox", name: "Cáo", src: "/avatars/fox.svg" },
  { id: "penguin", name: "Chim cánh cụt", src: "/avatars/penguin.svg" },
  { id: "owl", name: "Cú", src: "/avatars/owl.svg" },
  { id: "panda", name: "Gấu trúc", src: "/avatars/panda.svg" },
  { id: "frog", name: "Ếch", src: "/avatars/frog.svg" },
  { id: "chick", name: "Gà con", src: "/avatars/chick.svg" },
  { id: "pig", name: "Heo", src: "/avatars/pig.svg" },
  { id: "tiger", name: "Hổ", src: "/avatars/tiger.svg" },
  { id: "dragon", name: "Rồng", src: "/avatars/dragon.svg" },
] as const;

export type AvatarId = (typeof AVATARS)[number]["id"];

export function getAvatarById(id: string) {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0];
}

export function getRandomAvatar(seed: string): (typeof AVATARS)[number] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATARS[Math.abs(hash) % AVATARS.length];
}
