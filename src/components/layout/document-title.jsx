// React 19 hoists <title> and <meta> into <head>.
function DocumentTitle({ title, description }) {
  const fullTitle = title ? `${title} · PrepWise` : "PrepWise · AI interview preparation";
  return (
    <>
      <title>{fullTitle}</title>
      {description ? <meta name="description" content={description} /> : null}
    </>
  );
}

export { DocumentTitle };
