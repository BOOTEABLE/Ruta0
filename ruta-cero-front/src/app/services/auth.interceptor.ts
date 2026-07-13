import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  try {
    const token = localStorage.getItem('token');
    if (token) {
      const clonada = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      });
      return next(clonada);
    }
  } catch {
    // Ignorar durante SSR
  }
  return next(req);
};
