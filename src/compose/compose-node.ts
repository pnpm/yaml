import { Alias, Node } from '../ast/index.js'
import type { Document } from '../doc/Document.js'
import type { FlowScalar, Token } from '../parse/tokens.js'
import { composeCollection } from './compose-collection.js'
import { composeScalar } from './compose-scalar.js'
import { resolveEnd } from './resolve-end.js'

export interface Props {
  spaceBefore: boolean
  comment: string
  anchor: string
  tagName: string
}

export function composeNode(
  doc: Document.Parsed,
  token: Token | number,
  props: Props,
  onError: (offset: number, message: string, warning?: boolean) => void
) {
  if (typeof token === 'number')
    return composeEmptyNode(doc, token, props, onError)
  const { spaceBefore, comment, anchor, tagName } = props
  let node: Node.Parsed
  switch (token.type) {
    case 'alias':
      node = composeAlias(doc, token, onError)
      if (anchor || tagName)
        onError(token.offset, 'An alias node must not specify any properties')
      break
    case 'scalar':
    case 'single-quoted-scalar':
    case 'double-quoted-scalar':
    case 'block-scalar':
      node = composeScalar(doc, token, anchor, tagName, onError)
      break
    case 'block-map':
    case 'block-seq':
    case 'flow-collection':
      node = composeCollection(doc, token, anchor, tagName, onError)
      break
    default:
      console.log(token)
      throw new Error(`Unsupporten token type: ${(token as any).type}`)
  }
  if (spaceBefore) node.spaceBefore = true
  if (comment) {
    if (token.type === 'scalar' && token.source === '') node.comment = comment
    else node.commentBefore = comment
  }
  return node
}

function composeEmptyNode(
  doc: Document.Parsed,
  offset: number,
  { spaceBefore, comment, anchor, tagName }: Props,
  onError: (offset: number, message: string, warning?: boolean) => void
) {
  const token: FlowScalar = { type: 'scalar', offset, indent: -1, source: '' }
  const node = composeScalar(doc, token, anchor, tagName, onError)
  if (spaceBefore) node.spaceBefore = true
  if (comment) node.comment = comment
  return node
}

function composeAlias(
  doc: Document.Parsed,
  { offset, source, end }: FlowScalar,
  onError: (offset: number, message: string, warning?: boolean) => void
) {
  const name = source.substring(1)
  const src = doc.anchors.getNode(name)
  if (!src) onError(offset, `Aliased anchor not found: ${name}`)
  const alias = new Alias(src as Node)

  const re = resolveEnd(
    end,
    offset + source.length,
    doc.options.strict,
    onError
  )
  alias.range = [offset, re.offset]
  if (re.comment) alias.comment = re.comment
  return alias as Alias.Parsed
}