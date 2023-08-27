import { object, string } from 'yup';

export default object({
    phone: string().required("Phone Number is required").length(10, 'Phone number must be 10 characters long'),
    password: string().required("Password is required").min(8, 'Password must be at least 8 characters long'),
});