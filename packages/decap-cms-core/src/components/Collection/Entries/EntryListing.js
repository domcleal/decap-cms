import PropTypes from 'prop-types';
import React from 'react';
import ImmutablePropTypes from 'react-immutable-proptypes';
import styled from '@emotion/styled';
import { Waypoint } from 'react-waypoint';
import { Map, List } from 'immutable';
import { colors } from 'decap-cms-ui-default';

import { selectFields, selectInferredField } from '../../../reducers/collections';
import { filterNestedEntries } from './EntriesCollection';
import EntryCard from './EntryCard';

const CardsGrid = styled.ul`
  display: flex;
  flex-flow: row wrap;
  list-style-type: none;
  margin-left: -12px;
  margin-top: 16px;
  margin-bottom: 16px;
`;

const UnpublishedEntriesHeader = styled.p`
  font-size: 13px;
  font-weight: 500;
  color: ${colors.text};
  text-transform: uppercase;
  margin-bottom: 6px;
`;

class EntryListing extends React.Component {
  static propTypes = {
    collections: ImmutablePropTypes.iterable.isRequired,
    entries: ImmutablePropTypes.list,
    viewStyle: PropTypes.string,
    cursor: PropTypes.any.isRequired,
    handleCursorActions: PropTypes.func.isRequired,
    page: PropTypes.number,
    getUnpublishedEntries: PropTypes.func.isRequired,
    getWorkflowStatus: PropTypes.func.isRequired,
    filterTerm: PropTypes.string,
    t: PropTypes.func.isRequired,
  };

  componentDidMount() {
    // Manually validate PropTypes - React 19 breaking change
    PropTypes.checkPropTypes(EntryListing.propTypes, this.props, 'prop', 'EntryListing');
  }

  hasMore = () => {
    const hasMore = this.props.cursor?.actions?.has('append_next');
    return hasMore;
  };

  handleLoadMore = () => {
    if (this.hasMore()) {
      this.props.handleCursorActions('append_next');
    }
  };

  inferFields = collection => {
    const titleField = selectInferredField(collection, 'title');
    const descriptionField = selectInferredField(collection, 'description');
    const imageField = selectInferredField(collection, 'image');
    const fields = selectFields(collection);
    const inferredFields = [titleField, descriptionField, imageField];
    const remainingFields =
      fields && fields.filter(f => inferredFields.indexOf(f.get('name')) === -1);
    return { titleField, descriptionField, imageField, remainingFields };
  };

  getAllEntries = () => {
    const { entries, collections, filterTerm } = this.props;
    const collectionName = Map.isMap(collections) ? collections.get('name') : null;

    if (!collectionName) {
      return { publishedEntries: entries };
    }

    const unpublishedEntries = this.props.getUnpublishedEntries(collectionName);

    if (!unpublishedEntries || unpublishedEntries.length === 0) {
      return { publishedEntries: entries };
    }

    let unpublishedList = List(unpublishedEntries.map(entry => entry));

    if (collections.has('nested') && filterTerm) {
      const collectionFolder = collections.get('folder');
      const subfolders = collections.get('nested').get('subfolders') !== false;

      unpublishedList = filterNestedEntries(
        filterTerm,
        collectionFolder,
        unpublishedList,
        subfolders,
      );
    }

    const publishedSlugs = entries.map(entry => entry.get('slug')).toSet();
    const uniqueUnpublished = unpublishedList.filterNot(entry =>
      publishedSlugs.has(entry.get('slug')),
    );

    return {
      publishedEntries: entries,
      unpublishedEntries: uniqueUnpublished,
    };
  };

  renderCardsForSingleCollection = () => {
    const { publishedEntries, unpublishedEntries } = this.getAllEntries();

    return (
      <div>
        {this.renderCardsForEntries(publishedEntries)}
        {unpublishedEntries && unpublishedEntries.size > 0 && (
          <>
            <UnpublishedEntriesHeader>
              {this.props.t('collection.entries.unpublishedEntries')}
            </UnpublishedEntriesHeader>
            {this.renderCardsForEntries(unpublishedEntries)}
          </>
        )}
      </div>
    );
  };

  renderCardsForEntries = entries => {
    const { collections, viewStyle } = this.props;
    const inferredFields = this.inferFields(collections);
    const entryCardProps = { collection: collections, inferredFields, viewStyle };

    return (
      <CardsGrid>
        {entries.map((entry, idx) => {
          const workflowStatus = this.props.getWorkflowStatus(
            collections.get('name'),
            entry.get('slug'),
          );

          return (
            <EntryCard
              {...entryCardProps}
              entry={entry}
              workflowStatus={workflowStatus}
              key={idx}
            />
          );
        })}
      </CardsGrid>
    );
  };

  renderCardsForMultipleCollections = () => {
    const { collections, entries } = this.props;
    const isSingleCollectionInList = collections.size === 1;

    return (
      <div>
        <CardsGrid>
          {entries.map((entry, idx) => {
            const collectionName = entry.get('collection');
            const collection = collections.find(coll => coll.get('name') === collectionName);
            const collectionLabel = !isSingleCollectionInList && collection.get('label');
            const inferredFields = this.inferFields(collection);
            const workflowStatus = this.props.getWorkflowStatus(collectionName, entry.get('slug'));
            const entryCardProps = {
              collection,
              entry,
              inferredFields,
              collectionLabel,
              workflowStatus,
            };
            return <EntryCard {...entryCardProps} key={idx} />;
          })}
        </CardsGrid>
      </div>
    );
  };

  render() {
    const { collections, page } = this.props;

    return (
      <>
        {Map.isMap(collections)
          ? this.renderCardsForSingleCollection()
          : this.renderCardsForMultipleCollections()}
        {this.hasMore() && <Waypoint key={page} onEnter={this.handleLoadMore} />}
      </>
    );
  }
}

export default EntryListing;
