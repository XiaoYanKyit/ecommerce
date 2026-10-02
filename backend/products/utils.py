from django.utils.text import slugify


def unique_slugify(model, value, instance=None, max_length=250):
    """Return a slug for `value` that is unique within `model`."""
    base = slugify(value)[:max_length] or "item"
    slug, n = base, 2
    qs = model.objects.all()
    if instance is not None and instance.pk:
        qs = qs.exclude(pk=instance.pk)
    while qs.filter(slug=slug).exists():
        suffix = f"-{n}"
        slug = f"{base[: max_length - len(suffix)]}{suffix}"
        n += 1
    return slug
