import { ContentType } from 'contentful/index';
import { JSONSchema4 } from 'json-schema';
import { compile, Options } from 'json-schema-to-typescript';
import { chain, defaults, get, orderBy } from 'lodash';
import { buildRef, getByRef } from './built-in-definitions';
import { convertToJSONSchema } from './parser';
import { JSONSchema } from './types/json-schema';
import { ContentfulPhones.Accessory } from '../test';
//import Accessory = ContentfulPhones.Accessory;

const BANNER_COMMENT = `/**
* This file was automatically generated.
* DO NOT MODIFY IT BY HAND.
*/`;

export async function compileFromContentTypes(
  contentTypes: ContentType[],
  options: Partial<Options> = {},
  namespace?: string,
): Promise<string> {
  const settings = defaults(
    {
      bannerComment: BANNER_COMMENT,
    },
    options,
  );

  const allDefinitions = includeRequiredDefinitions(
    contentTypes.map((ct) => convertToJSONSchema(ct)),
  );

  var s:Accessory
  const resultSchema = {
    title: 'EphemeralContentfulSchemaRoot1',
    type: 'object',
    properties: chain(allDefinitions)
      .map((def) => [def.title, { $ref: buildRef(def) }])
      .fromPairs()
      .value(),
    definitions: chain(allDefinitions)
      .map((def) => [def.title, def])
      .fromPairs()
      .value(),
  };

  const res = await compile(resultSchema as JSONSchema4, EPHEMERAL_ROOT, settings);

  if (namespace) {
    `export declare namespace ${namespace} {\n`;
  }

  const contentFulTypeImport = 'import { Asset, Entry } from \'contentful\';';
  const content = cleanupEphemeralRoot(res);

  return contentFulTypeImport +
  namespace ? `export declare namespace ${namespace} {\n` : '' +
  content +
  namespace ? '\n}' : '';
}

const EPHEMERAL_ROOT = 'EphemeralContentfulSchemaRoot1';

function cleanupEphemeralRoot(input: string): string {
  return input.replace(new RegExp(`.+${EPHEMERAL_ROOT}.+[^{\}]+(?=}).+\n+`, 'gm'), '');
}

function getRefs(definition: JSONSchema): JSONSchema[] {
  return chain(definition.properties)
    .map((propSchema) => get(propSchema, '$ref'))
    .compact()
    .map((s) => getByRef(s))
    .compact()
    .value();
}

function includeRequiredDefinitions(definitions: JSONSchema[]): JSONSchema[] {
  const requiredBuiltInDefinitions: JSONSchema[] = chain(definitions)
    .map((def) => getRefs(def))
    .flatten()
    .value();

  const alphabetizedDefinitions = orderBy(definitions, ['title'], ['asc']);

  return alphabetizedDefinitions.concat(requiredBuiltInDefinitions);
}
