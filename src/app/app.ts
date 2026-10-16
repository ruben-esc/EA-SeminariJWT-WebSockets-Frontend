import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { ChatService } from './services/chat.service';
import { Navbar } from './components/navbar/navbar';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private chatService = inject(ChatService);

  ngOnInit() {
    // En cuanto la app arranca, pedimos recuperar la sesión con la cookie
    this.auth.refresh().subscribe({
      next: () => {
        // Al recargar en /authors, el Guard te habrá mandado a /login?returnUrl=/authors
        // Parseamos la URL actual para extraer ese "returnUrl"
        const urlTree = this.router.parseUrl(this.router.url);
        const returnUrl = urlTree.queryParams['returnUrl'] || '/';

        // Si la sesión es válida y estábamos en la pantalla de login,
        // devolvemos al usuario a la página en la que pulsó F5.
        if (this.router.url.startsWith('/login')) {
          this.router.navigateByUrl(returnUrl);
        }
      },
      error: () => {
        // Si no hay cookie o ha caducado, le dejamos en el login
        this.router.navigate(['/login']);
      }
    });

    this.chatService.bookCreated$.subscribe((notification) => {
      alert(`📚 Notificación: ${notification.message}`);
    });
  }
}