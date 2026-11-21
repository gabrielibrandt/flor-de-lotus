/** Erro de regra de negócio, com mensagem segura para exibir à usuária. */
export class AppError extends Error {
  constructor(message: string, public code: string = "APP_ERROR") {
    super(message);
    this.name = "AppError";
  }
}
export class ForbiddenError extends AppError {
  constructor(message = "Você não tem permissão para acessar este conteúdo.") {
    super(message, "FORBIDDEN");
  }
}
export class NotFoundError extends AppError {
  constructor(message = "Registro não encontrado.") {
    super(message, "NOT_FOUND");
  }
}
