export interface User {
  _id?: string;
  email: string;
  password: string;
  name: string;
  role?: 'admin' | 'user';
}

export interface Meeting {
  _id?: string;
  date: string;
  time: string;
  title: string;
  notes: string;
  zoomLink: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppConfig {
  _id?: string;
  defaultZoomLink: string;
  updatedAt: Date;
}