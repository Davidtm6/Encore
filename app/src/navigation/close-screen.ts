import { router } from 'expo-router';

/**
 * Closes the current screen: back to the screen it was opened from, or to My
 * List when there isn't one. On the web there's no earlier screen after
 * reloading the page or opening a link straight to Rank or Review, and a bare
 * router.back() would do nothing.
 */
export function closeScreen() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/');
  }
}
