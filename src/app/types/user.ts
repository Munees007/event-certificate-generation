export interface Student
{
    rollNo:string;
    name:string;
    department:string;
    year:number;
    includeSection:boolean;
    section: "A" | "B"
    gender: "Male" | "Female"
    prize: "I" | "II" | "III"
}

