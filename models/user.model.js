import mongoose, { Schema } from 'mongoose';

const userSchema =  new Schema({
  fullname: {type: String, required: true},
  email: {type: String, required: true},
  password: {type: String, required: true},
  createdAt: {type: Date, default: new Date().getDate()},
});

const UserModel  = mongoose.model('User', userSchema);

export default UserModel;