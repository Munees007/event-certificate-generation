import { Routes } from '@angular/router';
import { Home } from './home/home';
import { CertificateDesign } from './pages/certificate-design/certificate-design';

export const routes: Routes = [
    {
        title:"Hub Login",
        path:'',
        component:Home
    },
    {
        title:"Create",
        path:'generate-certify',
        component:CertificateDesign
    }
];
