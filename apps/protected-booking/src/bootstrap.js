// Neither a URL nor a stored browser value can activate this separate bundle.
// Importing the enabled entry initializes services, so it must remain lazy.
export async function bootstrapProtectedBooking({ enabled, renderDisabled, load }) {
  if (enabled !== 'true') return renderDisabled();
  return load();
}
