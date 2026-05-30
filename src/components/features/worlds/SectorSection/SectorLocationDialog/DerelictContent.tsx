import { Grid } from "@mui/material";
import { DebouncedOracleInput } from "components/shared/DebouncedOracleInput";
import { StarforgedLocationDerelict } from "types/SectorLocations.type";
import { GuideOnlyHeader } from "../../common";
import { ignoreApiError } from "config/api.config";
import { useSectorLocationMutations } from "./useSectorLocationMutations";

export interface DerelictContentProps {
  locationId: string;
  location: StarforgedLocationDerelict;
  showGMFields?: boolean;
  showGMTips?: boolean;
}

export function DerelictContent(props: DerelictContentProps) {
  const { locationId, location, showGMFields, showGMTips } = props;

  const { updateLocation } = useSectorLocationMutations();

  const locationOracleId = location.location
    ?.toLocaleLowerCase()
    .replaceAll(" ", "_");

  return (
    <>
      <Grid item xs={12} sm={6}>
        <DebouncedOracleInput
          label={"Name"}
          oracleTableId={undefined}
          initialValue={location.name}
          updateValue={(value) =>
            updateLocation(locationId, { name: value }).catch(ignoreApiError)
          }
        />
      </Grid>

      {showGMFields && (
        <>
          {showGMTips ? <GuideOnlyHeader /> : <Grid item xs={0} sm={6} />}
          <Grid item xs={12} sm={6}>
            <DebouncedOracleInput
              label={"Location"}
              oracleTableId={"starforged/oracles/derelicts/location"}
              initialValue={location.location ?? ""}
              updateValue={(value) =>
                updateLocation(locationId, { location: value }).catch(ignoreApiError)
              }
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <DebouncedOracleInput
              label={"Type"}
              oracleTableId={
                "starforged/oracles/derelicts/type/" + locationOracleId
              }
              initialValue={location.subType ?? ""}
              updateValue={(value) =>
                updateLocation(locationId, { subType: value }).catch(ignoreApiError)
              }
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <DebouncedOracleInput
              label={"Condition"}
              oracleTableId={"starforged/oracles/derelicts/condition"}
              initialValue={location.condition ?? ""}
              updateValue={(value) =>
                updateLocation(locationId, { condition: value }).catch(ignoreApiError)
              }
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <DebouncedOracleInput
              label={"Outer First Look"}
              oracleTableId={"starforged/oracles/derelicts/outer_first_look"}
              initialValue={location.outerFirstLook ?? ""}
              updateValue={(value) =>
                updateLocation(locationId, { outerFirstLook: value }).catch(
                  () => {}
                )
              }
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <DebouncedOracleInput
              label={"Inner First Look"}
              oracleTableId={"starforged/oracles/derelicts/inner_first_look"}
              initialValue={location.innerFirstLook ?? ""}
              updateValue={(value) =>
                updateLocation(locationId, { innerFirstLook: value }).catch(
                  () => {}
                )
              }
            />
          </Grid>
        </>
      )}
    </>
  );
}
