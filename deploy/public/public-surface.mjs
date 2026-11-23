/** Existing public feature policy, shared by the gateway and parity regression. */
export function classifyPublicPath(method, path) {
  const req = { method };
  const profileRoute = ((path === '/dasher' && ['GET', 'HEAD'].includes(req.method)) ||
    (path === '/account/profile' && ['GET', 'HEAD', 'POST'].includes(req.method)) ||
    (['/account/security', '/account/twofactor'].includes(path) && ['GET', 'HEAD'].includes(req.method)) ||
    (/^\/account\/signout\/(?:all|[A-Za-z0-9_-]{1,128})$/.test(path) && req.method === 'POST'));
  const puzzleRoute = (['GET', 'HEAD'].includes(req.method) && /^\/training(?:\/[A-Za-z0-9_-]+){0,3}$/.test(path) && !/^\/training\/(?:coordinate|batch|new|of-player|frame)(?:\/|$)/.test(path)) ||
    (req.method === 'POST' && /^\/training\/(?:complete\/[A-Za-z0-9_-]+\/[A-Za-z0-9]{5}|difficulty\/[A-Za-z0-9_-]+|[A-Za-z0-9]{5}\/(?:vote(?:\/[A-Za-z0-9_-]+)?|report))$/.test(path));
  const read = ['GET', 'HEAD'].includes(req.method), post = req.method === 'POST';
  const featureRoute =
    (post && path === "/translation/select") ||
    (read && path === "/api/users/status") ||
    (read && /^\/player(?:\/top\/(?:ultraBullet|bullet|blitz|rapid|classical))?$/.test(path)) ||
    (read && /^\/stat\/rating\/distribution\/(?:ultraBullet|bullet|blitz|rapid|classical)$/.test(path)) ||
    (read && /^\/account\/preferences\/(?:display|chess-clock|game-behavior|privacy|notification|engine-analysis)$/.test(path)) ||
    (post && /^\/account\/preferences(?:\/notification)?$/.test(path)) ||
    (read && /^(?:\/storm(?:\/dashboard(?:\/[A-Za-z0-9_-]+)?)?|\/streak|\/api\/streak|\/api\/player\/autocomplete|\/learn|\/training\/coordinate|\/games|\/notify|\/run\/captcha\/[A-Za-z0-9]{8})$/.test(path)) ||
    (read && /^\/player\/search\/[A-Za-z0-9_-]{2,30}$/.test(path)) ||
    (read && /^\/games\/best\/replacement\/[A-Za-z0-9]{8}$/.test(path)) ||
    (post && /^(?:\/storm|\/learn\/(?:score|reset)|\/training\/coordinate\/score|\/notify\/clear)$/.test(path)) ||
    (read && /^\/practice(?:\/[A-Za-z0-9_-]+){0,4}$/.test(path)) ||
    (post && /^\/practice\/(?:reset|complete\/[A-Za-z0-9]{8}\/\d{1,5})$/.test(path)) ||
    (read && /^\/forum(?:\/[A-Za-z0-9_-]+){0,4}$/.test(path) && !/^\/forum\/(?:search|diagnostic|community-blog-discussions)(?:\/|$)/.test(path)) ||
    (post && /^\/forum\/(?:[A-Za-z0-9_-]+\/(?:new|[A-Za-z0-9_-]+\/(?:close|sticky|new)|react\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\/(?:true|false))|(?:delete|relocate|post)\/[A-Za-z0-9_-]+)$/.test(path)) ||
    (read && /^\/study(?:\/[A-Za-z0-9_.-]+){0,4}$/.test(path) && !/^\/study\/search(?:\/|$)/.test(path)) ||
    (post && /^\/study(?:\/(?:as|list-format|topic|[A-Za-z0-9]{8}\/(?:delete|cloneApply|clear-chat|import-pgn|admin)))?$/.test(path));
  const friendRoute =
    (read && /^\/challenge(?:\/[A-Za-z0-9]{8})?$/.test(path)) ||
    (post && /^\/challenge\/[A-Za-z0-9]{8}\/(?:accept|decline|cancel)$/.test(path)) ||
    (post && path === '/setup/friend') ||
    (read && path === '/rel/blocks') ||
    (post && /^\/(?:api\/)?rel\/(?:follow|unfollow|block|unblock)\/[A-Za-z0-9_-]{1,30}$/.test(path));
  const patronRoute = path === '/patron' && ['GET', 'HEAD'].includes(req.method);
  const languageHome = read && /^\/(?:en|de|fr|ru|pt|hi|ja|zh|ko|es)$/.test(path);
  const infoRoute = read && /^\/(?:about|faq|contact|terms-of-service|privacy)$/.test(path);
  const analysisExportRoute = read && (/^\/export\/fen\.gif$/.test(path) || /^\/embed\/(?:analysis|game\/[A-Za-z0-9]{8}(?:\/(?:white|black))?)$/.test(path));
  const insightsRoute = (read && /^\/insights\/[A-Za-z0-9_-]{1,30}(?:\/[^/?#]+){0,12}$/.test(path) && !/^\/insights\/(?:data|refresh)\//.test(path)) ||
    (post && /^\/insights\/(?:data|refresh)\/[A-Za-z0-9_-]{1,30}$/.test(path));
  const arenaRoute = path !== '/tournament/featured' && (
    (read && /^\/tournament(?:\/(?:new|help|calendar|history(?:\/unique)?|[A-Za-z0-9]{8}(?:\/(?:edit|standing\/[1-9][0-9]{0,3}|(?:page-of|player)\/[A-Za-z0-9_-]{1,30}))?))?$/.test(path)) ||
    (post && /^\/tournament\/(?:new|[A-Za-z0-9]{8}\/(?:join|withdraw|edit|terminate|prepare))$/.test(path)));
  // Known inherited feature links get a translated native notice, never their blocked controller.
  const unsupportedFeature = (
    /^\/(?:blog|ublog|coach|tournament|simul|team|teams|broadcast|tv|racer|tutor|video|streamer|mobile|paste|import|report|inbox|page)(?:\.atom$|\/|$)/.test(path) ||
    /^\/@\/[A-Za-z0-9_-]{1,30}\/blog(?:\.atom$|\/|$)/.test(path) ||
    /^\/(?:forum|study|games)\/search(?:\/|$)/.test(path) ||
    /^\/player\/(?:bots|top\/correspondence)$/.test(path) ||
    /^\/stat\/rating\/distribution\/correspondence$/.test(path)
  );
  const unsupportedRead = read && !arenaRoute && (unsupportedFeature || path === "/account/kid");
  const supported = arenaRoute || insightsRoute || unsupportedRead || languageHome || analysisExportRoute || friendRoute || infoRoute || featureRoute || patronRoute || puzzleRoute || profileRoute || path === '/' || /^\/(?:club(?:\/|$)|analysis(?:\/|$)|editor(?:\/|$)|game(?:\/|$)|@\/|login$|signup$|logout$|player-count$|account\/now-playing$|lobby\/seeks$|timeline$|pref(?:\/|$)|whats-next\/|opening(?:\/|$)|api\/cloud-eval$)/.test(path) || /^\/[A-Za-z0-9]{8}(?:[A-Za-z0-9]{4})?(?:\/(?:white|black))?$/.test(path);

  return unsupportedRead ? "unsupported" : (supported && !((unsupportedFeature || path === "/account/kid") && !read && !arenaRoute)) ? "allow" : "deny";
}
