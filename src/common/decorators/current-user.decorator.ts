import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedUser } from '../types/authenticated-user';

type CurrentUserKey = keyof AuthenticatedUser;
type CurrentUserResult = AuthenticatedUser | AuthenticatedUser[CurrentUserKey] | undefined;

export const CurrentUser = createParamDecorator(
  (data: CurrentUserKey | undefined, ctx: ExecutionContext): CurrentUserResult => {
    const request = ctx.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    if (!data) return request.user;
    return request.user?.[data];
  },
);
