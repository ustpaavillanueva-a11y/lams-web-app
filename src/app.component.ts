import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterModule,CommonModule],
    template: `<router-outlet></router-outlet>`
})
export class AppComponent {}
