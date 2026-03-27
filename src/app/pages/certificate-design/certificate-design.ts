import { Component, ElementRef, QueryList, ViewChild, ViewChildren } from '@angular/core';
import {FormsModule, NgModel} from '@angular/forms'
@Component({
  selector: 'app-certificate-design',
  imports: [FormsModule],
  standalone:true,
  templateUrl: './certificate-design.html',
  styleUrl: './certificate-design.css',
})
export class CertificateDesign {
  certificateImg:File | null = null;
  @ViewChildren('textBox') inputRefs!: QueryList<ElementRef>
  url = '';
  currentIndex = 0
  texts:string[] = ["Fuck"];
  text:string = '';
  mouseX = 0
  mouseY = 0
  isSelected = false
  onFileChanged = (event:any) =>{
    const file = event.target.files[0];
    if(file)
    {
      this.certificateImg = file;
      this.onImageSelected();
    }
  }
  onImageSelected = () =>{
      if(this.certificateImg == null) return
      console.log(this.certificateImg)
      this.url = URL.createObjectURL(this.certificateImg);
      console.log(this.url);
  }
  addItem = () =>{
    this.texts.push(this.text)
  }

  moveTextLeft = ()=>{
    const elements = this.inputRefs.toArray()
    let pos = elements[this.currentIndex].nativeElement.style.left.replace("px","");
    let previous = parseInt(pos == '' ? "0" : pos);
    console.log(previous)
    elements[this.currentIndex].nativeElement.style.left = `${previous + 5}px`
  }

  moveTextRight = ()=>{
    const elements = this.inputRefs.toArray()
    let pos = elements[this.currentIndex].nativeElement.style.left.replace("px","");
    let previous = parseInt(pos == '' ? "0" : pos);
    console.log(previous)
    elements[this.currentIndex].nativeElement.style.left = `${previous - 5}px`
  }

  setIndex = (index:number) =>{
    this.currentIndex = index
    this.isSelected = !this.isSelected
  }
  mousePosition = (event:MouseEvent) =>{
    if(this.isSelected)
    {
      this.mouseX = event.clientX
    this.mouseY = event.clientY
    this.onDrag()
    }
  }
  onDrag = () =>{
    const elements = this.inputRefs.toArray()
    
    let pos = elements[this.currentIndex].nativeElement.style.left.replace("px","");
    let previous = parseInt(pos == '' ? "0" : pos);
    console.log(previous)
    elements[this.currentIndex].nativeElement.style.left = `${this.mouseX}px`
    elements[this.currentIndex].nativeElement.style.top = `${this.mouseY}px`
  }
}
