import { Component, NgModule, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {ToastrService} from "ngx-toastr"


@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('event-certificate-generation');
  constructor(private toastr : ToastrService) {}
  popUp = ()=>{
    this.toastr.show("Fucking Super")
  }
}
