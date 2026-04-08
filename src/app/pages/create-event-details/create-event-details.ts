import { Component, DoCheck, OnInit } from '@angular/core';
import { eventType } from '../../types/event';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Data } from '../../data';
import { Student } from '../../types/user';

@Component({
  selector: 'app-create-event-details',
  imports: [FormsModule],
  templateUrl: './create-event-details.html',
  styleUrl: './create-event-details.css',
})

export class CreateEventDetails {
  private readonly draftStorageKey = 'certify-hub-event-draft'
  private lastSavedSnapshot = '[]'

  readonly yearOptions = [1, 2, 3, 4]
  readonly sectionOptions: Array<'A' | 'B'> = ['A', 'B']
  readonly genderOptions: Array<'Male' | 'Female'> = ['Male', 'Female']
  readonly prizeOptions: Array<'I' | 'II' | 'III'> = ['I', 'II', 'III']

  helperMessage = 'Draft autosaves in this browser while you type.'
  event: eventType[] = []

  constructor (private router:Router,private dataService:Data){}

  ngOnInit = () =>{
    const restoredDraft = this.loadDraft()

    if (restoredDraft.length > 0) {
      this.event = restoredDraft
      this.helperMessage = 'Saved draft restored from local storage.'
    }

    this.lastSavedSnapshot = JSON.stringify(this.event)
    this.dataService.eventData = this.event
  }

  ngDoCheck = () =>{
    const currentSnapshot = JSON.stringify(this.event)

    if (currentSnapshot === this.lastSavedSnapshot) {
      return
    }

    this.lastSavedSnapshot = currentSnapshot
    this.saveDraft()
    this.dataService.eventData = this.event
  }

  addEvents = () =>{
    this.event.push({
      name:"",
      Students:[this.createStudent()]
    })
  }
  removeEvents = (index:number) =>{
    this.event = this.event.filter((_, i) => i !== index);
  }
  addStudents = (index:number) => {
    this.event[index].Students.push(this.createStudent())
  }

  removeStudents = (index: number,inx:number) => {
    this.event[inx].Students = this.event[inx].Students.filter((_, i) => i !== index);
  }

  gotoNextStep = () =>{
    this.dataService.eventData = this.event
    this.router.navigate(['/generate-certify'])
  }

  getTotalParticipants = () =>{
    return this.event.reduce((count, item) => count + item.Students.length, 0)
  }

  downloadExcelTemplate = () =>{
    const templateRows = [
      'eventName,participantName,rollNo,department,year,includeSection,section,gender,prize',
      'Coding Contest,Ganesh Moorthy,25PCA135,MCA,1,true,A,Male,I',
      'Coding Contest,Keerthana S,25PCA136,MCA,1,true,A,Female,II',
      'Debugging Challenge,Ram Kumar,24BCA101,BCA,3,false,,Male,I',
    ]

    const blob = new Blob([templateRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    this.downloadFile(blob, 'certificate-import-template.csv')
    this.helperMessage = 'Excel-friendly CSV template downloaded.'
  }

  importExcelTemplate = async (event: Event) =>{
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]

    if (!file) {
      return
    }

    try {
      const content = await file.text()
      const importedEvents = this.parseImportedCsv(content)

      if (importedEvents.length === 0) {
        this.helperMessage = 'No valid rows found in the imported file.'
      } else {
        this.event = importedEvents
        this.helperMessage = `Imported ${this.getTotalParticipants()} participants from the Excel template file.`
      }
    } catch {
      this.helperMessage = 'Unable to read the import file. Use the provided CSV template and save it from Excel.'
    } finally {
      input.value = ''
    }
  }

  private createStudent = (): Student =>{
    return {
      name:"",
      department:"",
      rollNo:"",
      year:1,
      includeSection:true,
      section:"A",
      gender:"Male",
      prize:"I"
    }
  }

  private loadDraft = (): eventType[] =>{
    try {
      const draft = localStorage.getItem(this.draftStorageKey)

      if (!draft) {
        return []
      }

      return this.sanitizeEvents(JSON.parse(draft))
    } catch {
      return []
    }
  }

  private saveDraft = () =>{
    try {
      localStorage.setItem(this.draftStorageKey, JSON.stringify(this.event))
    } catch {
      this.helperMessage = 'Autosave failed in this browser, but your current data is still on screen.'
    }
  }

  private sanitizeEvents = (value: unknown): eventType[] =>{
    if (!Array.isArray(value)) {
      return []
    }

    return value.map((item) => {
      const eventItem = item as Partial<eventType>
      const students = Array.isArray(eventItem.Students) ? eventItem.Students : []

      return {
        name: typeof eventItem.name === 'string' ? eventItem.name : '',
        Students: students.map((student) => this.sanitizeStudent(student)),
      }
    })
  }

  private sanitizeStudent = (value: unknown): Student =>{
    const student = value as Partial<Student>

    return {
      name: typeof student.name === 'string' ? student.name : '',
      department: typeof student.department === 'string' ? student.department : '',
      rollNo: typeof student.rollNo === 'string' ? student.rollNo : '',
      year: this.yearOptions.includes(Number(student.year)) ? Number(student.year) : 1,
      includeSection: student.includeSection !== false,
      section: student.section === 'B' ? 'B' : 'A',
      gender: student.gender === 'Female' ? 'Female' : 'Male',
      prize: this.prizeOptions.includes(student.prize as 'I' | 'II' | 'III') ? student.prize as 'I' | 'II' | 'III' : 'I',
    }
  }

  private parseImportedCsv = (content: string): eventType[] =>{
    const lines = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)

    if (lines.length < 2) {
      return []
    }

    const headers = this.parseCsvLine(lines[0]).map((value) => value.trim().toLowerCase())
    const eventsMap = new Map<string, eventType>()

    for (let index = 1; index < lines.length; index += 1) {
      const row = this.parseCsvLine(lines[index])

      if (row.every((value) => value.trim() === '')) {
        continue
      }

      const rowData = this.mapCsvRow(headers, row)
      const eventName = rowData['eventname']?.trim() || 'Imported Event'

      if (!eventsMap.has(eventName)) {
        eventsMap.set(eventName, {
          name: eventName,
          Students: [],
        })
      }

      eventsMap.get(eventName)?.Students.push({
        name: rowData['participantname']?.trim() || '',
        rollNo: rowData['rollno']?.trim() || '',
        department: rowData['department']?.trim().toUpperCase() || '',
        year: this.yearOptions.includes(Number(rowData['year'])) ? Number(rowData['year']) : 1,
        includeSection: rowData['includesection']?.trim().toLowerCase() !== 'false',
        section: rowData['section']?.trim().toUpperCase() === 'B' ? 'B' : 'A',
        gender: rowData['gender']?.trim().toLowerCase() === 'female' ? 'Female' : 'Male',
        prize: this.normalizePrize(rowData['prize']),
      })
    }

    return Array.from(eventsMap.values())
  }

  private mapCsvRow = (headers: string[], row: string[]) =>{
    return headers.reduce<Record<string, string>>((accumulator, header, index) => {
      accumulator[header] = row[index] ?? ''
      return accumulator
    }, {})
  }

  private parseCsvLine = (line: string): string[] =>{
    const values: string[] = []
    let current = ''
    let insideQuotes = false

    for (let index = 0; index < line.length; index += 1) {
      const char = line[index]

      if (char === '"') {
        if (insideQuotes && line[index + 1] === '"') {
          current += '"'
          index += 1
        } else {
          insideQuotes = !insideQuotes
        }
      } else if (char === ',' && !insideQuotes) {
        values.push(current)
        current = ''
      } else {
        current += char
      }
    }

    values.push(current)
    return values
  }

  private normalizePrize = (value: string): 'I' | 'II' | 'III' =>{
    const prizeValue = value.trim().toUpperCase()

    if (prizeValue === 'II') {
      return 'II'
    }

    if (prizeValue === 'III') {
      return 'III'
    }

    return 'I'
  }

  private downloadFile = (blob: Blob, fileName: string) =>{
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fileName
    anchor.click()
    URL.revokeObjectURL(url)
  }
}
