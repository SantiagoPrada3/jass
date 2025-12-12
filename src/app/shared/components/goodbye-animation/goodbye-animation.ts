import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-goodbye-animation',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './goodbye-animation.html',
  styleUrls: ['./goodbye-animation.css'],
})
export class GoodbyeAnimation implements OnInit {
  private readonly router = inject(Router);

  ngOnInit() {
    setTimeout(() => {
      this.router.navigate(['/']);
    }, 3000);
  }
}
