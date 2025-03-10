import React, { useState, useEffect } from 'react';
import { registerComponent, Components } from '../../lib/vulcan-lib';
import { useOnNavigate } from '../hooks/useOnNavigate';
import { InstantSearch, SearchBox, connectMenu } from 'react-instantsearch-dom';
import classNames from 'classnames';
import CloseIcon from '@material-ui/icons/Close';
import Portal from '@material-ui/core/Portal';
import IconButton from '@material-ui/core/IconButton';
import { useNavigation } from '../../lib/routeUtil';
import withErrorBoundary from '../common/withErrorBoundary';
import { getAlgoliaIndexName, getSearchClient, isSearchEnabled } from '../../lib/search/algoliaUtil';
import { forumTypeSetting, isEAForum } from '../../lib/instanceSettings';
import qs from 'qs'
import { useSearchAnalytics } from '../search/useSearchAnalytics';
import { useCurrentUser } from './withUser';

const VirtualMenu = connectMenu(() => null);

const styles = (theme: ThemeType): JssStyles => ({
  root: {
    display: 'flex',
    alignItems: 'center',
  },
  rootChild: {
    height: 'fit-content'
  },
  searchInputArea: {
    display: "block",
    position: "relative",
    minWidth: 48,
    height: 48,

    "& .ais-SearchBox": {
      display: 'inline-block',
      position: 'relative',
      maxWidth: 300,
      width: '100%',
      height: 46,
      whiteSpace: 'nowrap',
      boxSizing: 'border-box',
      fontSize: 14,
    },
    "& .ais-SearchBox-form": {
      height: '100%'
    },
    "& .ais-SearchBox-submit":{
      display: "none"
    },
    // This is a class generated by React InstantSearch, which we don't have direct control over so
    // are doing a somewhat hacky thing to style it.
    "& .ais-SearchBox-input": {
      display:"none",

      height: "100%",
      width: "100%",
      paddingTop: isEAForum ? 5 : undefined,
      paddingRight: 0,
      paddingLeft: 48,
      verticalAlign: "bottom",
      borderStyle: "none",
      boxShadow: "none",
      backgroundColor: "transparent",
      fontSize: 'inherit',
      "-webkit-appearance": "none",
      cursor: "text",
      borderRadius: 5,
    },
    "&.open .ais-SearchBox-input": {
      display:"inline-block",
    },
  },
  searchInputAreaSmall: isEAForum ? {
    minWidth: 34,
  } : {},
  searchIcon: {
    position: 'fixed',
    color: isEAForum ? undefined : theme.palette.header.text,
  },
  searchIconSmall: isEAForum ? {
    padding: 6,
    marginTop: 6,
  } : {},
  closeSearchIcon: {
    fontSize: 14,
  },
  searchBarClose: {
    display: "inline-block",
    position: "absolute",
    top: isEAForum ? 18 : 15,
    right: 5,
    cursor: "pointer"
  },
  alignmentForum: {
    "& .ais-SearchBox-input": {
      color: theme.palette.panelBackground.default,
    },
    "& .ais-SearchBox-input::placeholder": {
      color: theme.palette.text.invertedBackgroundText3,
    },
  },
})

const SearchBar = ({onSetIsActive, searchResultsArea, classes}: {
  onSetIsActive: (active:boolean)=>void,
  searchResultsArea: any,
  classes: ClassesType
}) => {
  const currentUser = useCurrentUser()
  const [inputOpen,setInputOpen] = useState(false);
  const [searchOpen,setSearchOpen] = useState(false);
  const [currentQuery,setCurrentQuery] = useState("");
  const { history } = useNavigation();
  const captureSearch = useSearchAnalytics();

  const handleSubmit = () => {
    history.push({pathname: `/search`, search: `?${qs.stringify({query: currentQuery})}`});
    closeSearch()
  }
  
  useOnNavigate(() => {
    closeSearch();
  });


  const openSearchResults = () => setSearchOpen(true);
  const closeSearchResults = () => setSearchOpen(false);

  const closeSearch = () => {
    setSearchOpen(false);
    setInputOpen(false);
    if (onSetIsActive)
      onSetIsActive(false);
  }

  const handleSearchTap = () => {
    setInputOpen(true);
    setSearchOpen(!!currentQuery);
    if (onSetIsActive)
      onSetIsActive(true);
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') closeSearch();
    if (event.keyCode === 13) handleSubmit()
  }

  const queryStateControl = (searchState: any): void => {
    if (searchState.query !== currentQuery) {
      setCurrentQuery(searchState.query);
      if (searchState.query) {
        openSearchResults();
      } else {
        closeSearchResults();
      }
    }
  }

  useEffect(() => {
    if (currentQuery) {
      captureSearch("searchBar", {query: currentQuery});
    }
  }, [currentQuery, captureSearch])

  const alignmentForum = forumTypeSetting.get() === 'AlignmentForum';
  const { SearchBarResults, ForumIcon } = Components

  if (!isSearchEnabled()) {
    return <div>Search is disabled (ElasticSearch not configured on server)</div>
  }

  return <div className={classes.root} onKeyDown={handleKeyDown}>
    <div className={classes.rootChild}>
      <InstantSearch
        indexName={getAlgoliaIndexName("Posts")}
        searchClient={getSearchClient()}
        onSearchStateChange={queryStateControl}
      >
        <div className={classNames(
          classes.searchInputArea,
          {"open": inputOpen},
          {[classes.alignmentForum]: alignmentForum, [classes.searchInputAreaSmall]: !currentUser}
        )}>
          {alignmentForum && <VirtualMenu attribute="af" defaultRefinement="true" />}
          <div onClick={handleSearchTap}>
            <IconButton className={classNames(classes.searchIcon, {[classes.searchIconSmall]: !currentUser})}>
              <ForumIcon icon="Search" />
            </IconButton>
            {/* Ignored because SearchBox is incorrectly annotated as not taking null for its reset prop, when
              * null is the only option that actually suppresses the extra X button.
             // @ts-ignore */}
            {inputOpen && <SearchBox reset={null} focusShortcuts={[]} autoFocus={true} />}
          </div>
          { searchOpen && <div className={classes.searchBarClose} onClick={closeSearch}>
            <CloseIcon className={classes.closeSearchIcon}/>
          </div>}
          <div>
            { searchOpen && <Portal container={searchResultsArea.current}>
                <SearchBarResults closeSearch={closeSearch} currentQuery={currentQuery} />
              </Portal> }
          </div>
        </div>
      </InstantSearch>
    </div>
  </div>
}

const SearchBarComponent = registerComponent("SearchBar", SearchBar, {
  styles,
  hocs: [withErrorBoundary],
  areEqual: "auto",
});

declare global {
  interface ComponentTypes {
    SearchBar: typeof SearchBarComponent
  }
}
