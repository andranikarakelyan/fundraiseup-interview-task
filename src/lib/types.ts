import { ObjectId } from "mongodb";

export interface IUserData {
  _id: ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  address: {
    line1: string;
    line2: string;
    postcode: string;
    city: string;
    state: string;
    country: string;
  };
  createdAt: Date;
}

export interface ICursorData {
  name: string;
  resume_token: ObjectId;
}
