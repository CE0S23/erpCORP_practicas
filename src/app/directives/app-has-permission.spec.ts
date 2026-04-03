import { AppHasPermission } from './app-has-permission';

describe('AppHasPermission', () => {
  it('should create an instance', () => {
    const directive = new AppHasPermission();
    expect(directive).toBeTruthy();
  });
});
