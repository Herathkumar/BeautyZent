export function sourceLabel(source: string) {
  switch (source) {
    case "WALK_IN":
      return "Walk-in";
    case "PHONE":
      return "Phone";
    case "ADMIN":
      return "Front desk";
    case "ONLINE":
      return "Online";
    default:
      return source;
  }
}
