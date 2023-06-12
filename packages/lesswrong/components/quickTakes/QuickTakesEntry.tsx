import React, { useState, useCallback, useEffect } from "react";
import { registerComponent, Components } from "../../lib/vulcan-lib";
import { generateTokenRequest } from "../../lib/ckEditorUtils";

const entryStyles = (theme: ThemeType) => ({
  padding: 10,
  background: theme.palette.grey[100],
  borderRadius: theme.borderRadius.default,
  "& .ck-placeholder::before": {
    color: theme.palette.grey[600],
  },
});

const styles = (theme: ThemeType) => ({
  root: {
    background: theme.palette.panelBackground.default,
    borderRadius: theme.borderRadius.default,
    fontFamily: theme.palette.fonts.sansSerifStack,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "12px",
    padding: 12,
  },
  shareMessage: {
    width: "100%",
    height: 40,
    fontFamily: theme.palette.fonts.sansSerifStack,
    fontWeight: 500,
    fontSize: 14,
    userSelect: "none",
    cursor: "pointer",
    color: theme.palette.grey[600],
    "& *": {
      transform: "translate(1px, 1px)",
    },
    ...entryStyles(theme),
  },
  commentForm: {
    width: "100%",
    "& .CommentsNewForm-form": {
      padding: 0,
    },
    "& .CommentsNewForm-submit": {
      ...entryStyles(theme),
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
      paddingTop: 0,
    },
    "& .form-component-EditorFormComponent": {
      ...entryStyles(theme),
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      marginBottom: 0,
      paddingBottom: 0,
    },
  },
});

const placeholder = "Share exploratory, draft-stage, rough thoughts...";

const QuickTakesEntry = ({currentUser, classes}: {
  currentUser: UsersCurrent,
  classes: ClassesType,
}) => {
  const [expanded, setExpanded] = useState(false);

  const onExpand = useCallback(() => setExpanded(true), []);
  const onSuccess = useCallback(() => {}, []);
  const onCancel = useCallback(() => {}, []);
  // const onBlur = useCallback(() => setExpanded(false), []);
  // const onPublish = useCallback((event) => {
    // event.preventDefault();
  // }, [currentUser]);
  useEffect(() => {
    void generateTokenRequest("Comments", "contents")();
  }, []);

  const {CommentsNewForm} = Components;
  return (
    <div className={classes.root}>
      {!expanded &&
        <div className={classes.shareMessage} onClick={onExpand}>
          <div>{placeholder}</div>
        </div>
      }
      {expanded &&
        <CommentsNewForm
          prefilledProps={{
            shortform: true,
          }}
          successCallback={onSuccess}
          cancelCallback={onCancel}
          type="comment"
          formProps={{
            editorHintText: placeholder,
          }}
          className={classes.commentForm}
        />
      }
    </div>
  );
}

const QuickTakesEntryComponent = registerComponent(
  "QuickTakesEntry",
  QuickTakesEntry,
  {styles},
);

declare global {
  interface ComponentTypes {
    QuickTakesEntry: typeof QuickTakesEntryComponent
  }
}
