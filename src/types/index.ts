export interface User {
  _id?: string;
  email: string;
  password: string;
  name: string;
}

export interface Meeting {
  _id?: string;
  date: string;
  title: string;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}