export type Product = {
  id: string;
  title: string;
  category: string;
  price: number;
  stock: number;
  status: "Active" | "Draft";
  image: string;
  description: string;
};

export type Settings = {
  name: string;
  email: string;
  shipping: number;
  threshold: number;
};
export const initialSettings: Settings = {
  name: "Sunday Supply",
  email: "hello@example.com",
  shipping: 500,
  threshold: 10000,
};
export const initialProducts: Product[] = [
  {
    id: "p1",
    title: "Everyday ceramic mug",
    category: "Kitchen",
    price: 2400,
    stock: 32,
    status: "Active",
    image: "photo-1514228742587-6b1558fcca3d",
    description:
      "A comforting daily ritual. A stoneware mug with a softly glazed finish, made for slow mornings.",
  },
  {
    id: "p2",
    title: "Everyday canvas backpack",
    category: "Accessories",
    price: 3800,
    stock: 18,
    status: "Active",
    image: "photo-1553062407-98eeb64c6a62",
    description:
      "Your take-everywhere companion. A roomy everyday bag for market trips and weekend adventures.",
  },
  {
    id: "p3",
    title: "Botanical room candle",
    category: "Living",
    price: 3200,
    stock: 24,
    status: "Active",
    image: "photo-1603006905003-be475563bc59",
    description:
      "Make a little room for calm. A warm botanical scent for your favorite corner of home.",
  },
  {
    id: "p4",
    title: "Weekend reading chair",
    category: "Living",
    price: 18900,
    stock: 6,
    status: "Active",
    image: "photo-1567538096630-e0c55bd6374c",
    description:
      "An inviting seat for quiet afternoons, with a clean silhouette and a warm, natural finish.",
  },
  {
    id: "p5",
    title: "Quiet moments notebook",
    category: "Stationery",
    price: 1800,
    stock: 45,
    status: "Draft",
    image: "photo-1531346878377-a5be20888e57",
    description:
      "A place for plans, little observations, and your next big idea.",
  },
  {
    id: "p6",
    title: "Slow living art print",
    category: "Living",
    price: 6800,
    stock: 0,
    status: "Active",
    image: "photo-1600210492486-724fe5c67fb0",
    description:
      "A warm interior photograph to bring a little calm to your favorite wall.",
  },
];
export const demoOrders = [
  {
    reference: "SC-1042",
    customer: "Alex Morgan",
    email: "alex@example.com",
    date: "Oct 3, 2026",
    total: 6100,
    payment: "Paid",
    fulfillment: "Unfulfilled",
    items: "Everyday ceramic mug × 1, Botanical room candle × 1",
    address: "Fictional address · Singapore",
    shipping: 500,
  },
  {
    reference: "SC-1041",
    customer: "Jamie Lee",
    email: "jamie@example.com",
    date: "Oct 2, 2026",
    total: 4300,
    payment: "Paid",
    fulfillment: "Shipped",
    items: "Everyday canvas backpack × 1",
    address: "Fictional address · Singapore",
    shipping: 500,
  },
  {
    reference: "SC-1040",
    customer: "Sam Rivera",
    email: "sam@example.com",
    date: "Oct 1, 2026",
    total: 3700,
    payment: "Failed",
    fulfillment: "Unfulfilled",
    items: "Botanical room candle × 1",
    address: "Fictional address · Singapore",
    shipping: 500,
  },
];
export const money = (minorUnits: number) =>
  new Intl.NumberFormat("en-SG", { style: "currency", currency: "SGD" }).format(
    minorUnits / 100,
  );
export const photo = (id: string, width = 500) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=80`;
