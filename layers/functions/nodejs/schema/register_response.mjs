import { object, string, number } from 'yup';

export default object({
    name: string().required("Name is required").min(3, 'Name must be at-least 3 characters long'),
    phone: string().required("Phone Number is required").length(10, 'Phone number must be 10 characters long'),
    age: number().required("Age is required").positive().integer(),
    pincode: number().required("Pincode is required").positive().integer(),
    password: string().required("Password is required").min(8, 'Password must be at least 8 characters long'),
    aadhar: string().required("Aadhar Number is required").length(12, 'Aadhar Number must be exactly 12 characters long'),
});