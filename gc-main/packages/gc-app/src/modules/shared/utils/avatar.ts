export function generateAvatarFallback(value: string) {
  const names = value.split(" ").filter((name) => name)
  const mapped = names.map((name) => name.charAt(0).toUpperCase())

  return mapped.join("")
}

export function getInitials(fullName: string) {
  const nameParts = fullName.split(" ")
  const firstNameInitial = nameParts[0]?.charAt(0).toUpperCase() ?? ""
  const lastNameInitial = nameParts[1]?.charAt(0).toUpperCase() ?? ""
  return `${firstNameInitial}${lastNameInitial}`
}
