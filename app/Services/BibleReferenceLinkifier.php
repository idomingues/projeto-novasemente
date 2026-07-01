<?php

namespace App\Services;

class BibleReferenceLinkifier
{
    public function __construct(
        private readonly BibleReferenceParser $parser,
    ) {}

    public function linkifyHtml(string $html): string
    {
        if (trim($html) === '') {
            return $html;
        }

        $dom = new \DOMDocument();
        libxml_use_internal_errors(true);
        $wrapped = '<?xml encoding="utf-8" ?><div id="bible-ref-root">'.$html.'</div>';
        if (! @$dom->loadHTML($wrapped, LIBXML_NOWARNING | LIBXML_NOERROR)) {
            libxml_clear_errors();

            return $html;
        }
        libxml_clear_errors();

        $root = $dom->getElementById('bible-ref-root');
        if (! $root instanceof \DOMElement) {
            return $html;
        }

        $this->linkifyContainer($dom, $root);

        $out = '';
        foreach ($root->childNodes as $child) {
            $out .= $dom->saveHTML($child);
        }

        return trim($out);
    }

    private function linkifyContainer(\DOMDocument $dom, \DOMElement $container): void
    {
        $children = [];
        foreach ($container->childNodes as $child) {
            $children[] = $child;
        }

        foreach ($children as $child) {
            if (! $child instanceof \DOMElement) {
                continue;
            }

            $tag = strtolower($child->nodeName);
            if (in_array($tag, ['script', 'style', 'button', 'a'], true)) {
                continue;
            }

            if (in_array($tag, ['p', 'li', 'h2', 'h3', 'h4'], true)) {
                $this->linkifyBlock($dom, $child);

                continue;
            }

            if (in_array($tag, ['div', 'blockquote'], true) && ! $this->hasBlockChildren($child)) {
                $this->linkifyBlock($dom, $child);

                continue;
            }

            $this->linkifyContainer($dom, $child);
        }
    }

    private function hasBlockChildren(\DOMElement $element): bool
    {
        foreach ($element->childNodes as $child) {
            if ($child instanceof \DOMElement) {
                $tag = strtolower($child->nodeName);
                if (in_array($tag, ['p', 'div', 'blockquote', 'ul', 'ol', 'h2', 'h3', 'h4'], true)) {
                    return true;
                }
            }
        }

        return false;
    }

    private function linkifyBlock(\DOMDocument $dom, \DOMElement $element): void
    {
        $text = $element->textContent ?? '';
        $matches = $this->parser->findAllInText($text);
        if ($matches === []) {
            return;
        }

        while ($element->firstChild) {
            $element->removeChild($element->firstChild);
        }

        $cursor = 0;
        $textLength = mb_strlen($text);

        foreach ($matches as $match) {
            $offset = (int) $match['offset'];
            $length = (int) $match['length'];

            if ($offset > $cursor) {
                $element->appendChild($dom->createTextNode(mb_substr($text, $cursor, $offset - $cursor)));
            }

            $button = $dom->createElement('button');
            $button->setAttribute('type', 'button');
            $button->setAttribute('class', 'bible-ref-link');
            $button->setAttribute('data-bible-ref', (string) $match['inner']);
            $button->appendChild($dom->createTextNode((string) $match['display']));
            $element->appendChild($button);

            $cursor = $offset + $length;
        }

        if ($cursor < $textLength) {
            $element->appendChild($dom->createTextNode(mb_substr($text, $cursor)));
        }
    }
}
