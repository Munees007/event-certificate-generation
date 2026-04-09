export type Prize = 'I' | 'II' | 'III'

export interface Student
{
    rollNo:string;
    name:string;
    department:string;
    year:number;
    includeSection:boolean;
    section: "A" | "B";
    gender: "Male" | "Female";
    includePrize:boolean;
    prize: Prize;
}

