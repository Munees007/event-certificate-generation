import { Component } from '@angular/core';
import { LoginForm } from "../components/login-form/login-form";

@Component({
  selector: 'app-home',
  imports: [LoginForm],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {}
